import axios from 'axios';
import connectDB from './mongodb.js';
import Lead from '../models/Lead.js';
import Campaign from '../models/Campaign.js';
import AdMetric from '../models/AdMetric.js';
import SyncLog from '../models/SyncLog.js';

const BASE_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const FORM_IDS = (process.env.META_FORM_IDS || '').split(',').filter(Boolean);

// Exponential backoff retry
async function fetchWithRetry(url, params, retries = 3, delay = 1000) {
  try {
    const res = await axios.get(url, { params, timeout: 15000 });
    return res.data;
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, params, retries - 1, delay * 2);
  }
}

// Sync leads from all configured Meta lead forms
export async function syncMetaLeads() {
  await connectDB();
  const results = [];

  if (!ACCESS_TOKEN || FORM_IDS.length === 0) {
    await SyncLog.create({
      platform: 'meta',
      status: 'failed',
      message: 'Missing META_ACCESS_TOKEN or META_FORM_IDS',
      timestamp: new Date(),
    });
    return { success: false, message: 'Missing configuration' };
  }

  for (const formId of FORM_IDS) {
    try {
      let url = `${BASE_URL}/${formId}/leads`;
      let hasMore = true;
      let cursor = null;

      while (hasMore) {
        const params = {
          access_token: ACCESS_TOKEN,
          fields: 'id,created_time,field_data,ad_id,campaign_id',
          limit: 100,
          ...(cursor ? { after: cursor } : {}),
        };

        const data = await fetchWithRetry(url, params);
        const rawLeads = data.data || [];

        for (const rawLead of rawLeads) {
          const fields = {};
          (rawLead.field_data || []).forEach((f) => {
            fields[f.name] = f.values?.[0] || '';
          });

          const existing = await Lead.findOne({ platformLeadId: rawLead.id });
          if (existing) continue;

          // Resolve or create campaign
          let campaignDoc = null;
          if (rawLead.campaign_id) {
            campaignDoc = await Campaign.findOne({ platformCampaignId: rawLead.campaign_id });
            if (!campaignDoc) {
              campaignDoc = await Campaign.create({
                platformCampaignId: rawLead.campaign_id,
                name: `Meta Campaign ${rawLead.campaign_id}`,
                platform: 'meta',
                service: 'Digital Marketing',
                status: 'active',
                startDate: new Date(),
              });
            }
          }

          await Lead.create({
            platformLeadId: rawLead.id,
            name: fields['full_name'] || fields['name'] || 'Unknown',
            email: fields['email'] || '',
            phone: fields['phone_number'] || fields['phone'] || '',
            source: 'meta',
            campaignId: campaignDoc?._id || null,
            service: detectService(fields),
            status: 'new',
            receivedAt: new Date(rawLead.created_time),
            createdAt: new Date(),
          });

          results.push(rawLead.id);
        }

        cursor = data.paging?.cursors?.after;
        hasMore = !!data.paging?.next && !!cursor;
      }
    } catch (err) {
      await SyncLog.create({
        platform: 'meta',
        status: 'failed',
        message: `Form ${formId}: ${err.message}`,
        timestamp: new Date(),
      });
    }
  }

  await SyncLog.create({
    platform: 'meta',
    status: 'success',
    message: `Synced ${results.length} new leads`,
    timestamp: new Date(),
  });

  return { success: true, newLeads: results.length };
}

// Sync ad metrics from Meta
export async function syncMetaMetrics() {
  await connectDB();

  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    await SyncLog.create({
      platform: 'meta_metrics',
      status: 'failed',
      message: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID',
      timestamp: new Date(),
    });
    return { success: false };
  }

  try {
    const url = `${BASE_URL}/act_${AD_ACCOUNT_ID}/insights`;
    const params = {
      access_token: ACCESS_TOKEN,
      level: 'campaign',
      fields: 'campaign_id,campaign_name,impressions,clicks,ctr,cpc,spend,actions,date_start,date_stop',
      date_preset: 'last_7d',
      time_increment: 1,
      limit: 500,
    };

    const data = await fetchWithRetry(url, params);
    const rows = data.data || [];

    for (const row of rows) {
      const conversions = (row.actions || []).find(
        (a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      const convCount = parseInt(conversions?.value || '0', 10);
      const spend = parseFloat(row.spend || 0);
      const impressions = parseInt(row.impressions || 0, 10);
      const clicks = parseInt(row.clicks || 0, 10);

      // Resolve campaign
      let campaignDoc = await Campaign.findOne({ platformCampaignId: row.campaign_id });
      if (!campaignDoc) {
        campaignDoc = await Campaign.create({
          platformCampaignId: row.campaign_id,
          name: row.campaign_name,
          platform: 'meta',
          service: 'Digital Marketing',
          status: 'active',
          startDate: new Date(),
        });
      }

      const date = new Date(row.date_start);

      await AdMetric.findOneAndUpdate(
        { campaignId: campaignDoc._id, date },
        {
          campaignId: campaignDoc._id,
          date,
          impressions,
          clicks,
          ctr: parseFloat(row.ctr || 0),
          cpc: parseFloat(row.cpc || 0),
          spend,
          conversions: convCount,
          costPerLead: convCount > 0 ? spend / convCount : 0,
          syncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    await SyncLog.create({
      platform: 'meta_metrics',
      status: 'success',
      message: `Synced ${rows.length} metric rows`,
      timestamp: new Date(),
    });

    return { success: true, rows: rows.length };
  } catch (err) {
    await SyncLog.create({
      platform: 'meta_metrics',
      status: 'failed',
      message: err.message,
      timestamp: new Date(),
    });
    return { success: false, error: err.message };
  }
}

function detectService(fields) {
  const text = Object.values(fields).join(' ').toLowerCase();
  if (text.includes('web') || text.includes('website')) return 'Web Development';
  if (text.includes('graphic') || text.includes('design')) return 'Graphic Designing';
  return 'Digital Marketing';
}
