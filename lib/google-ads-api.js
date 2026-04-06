import axios from 'axios';
import connectDB from './mongodb.js';
import Lead from '../models/Lead.js';
import Campaign from '../models/Campaign.js';
import AdMetric from '../models/AdMetric.js';
import SyncLog from '../models/SyncLog.js';

const DEVELOPER_TOKEN = process.env.GOOGLE_DEVELOPER_TOKEN;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');

const GOOGLE_API_BASE = 'https://googleads.googleapis.com/v14';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

// Get OAuth2 access token
async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const res = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  cachedAccessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in * 1000);
  return cachedAccessToken;
}

function googleAdsHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
}

// Exponential backoff retry
async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

// Sync leads from Google Ads LeadFormSubmissions
export async function syncGoogleLeads() {
  await connectDB();

  if (!DEVELOPER_TOKEN || !CLIENT_ID || !REFRESH_TOKEN || !CUSTOMER_ID) {
    await SyncLog.create({
      platform: 'google',
      status: 'failed',
      message: 'Missing Google Ads credentials',
      timestamp: new Date(),
    });
    return { success: false, message: 'Missing configuration' };
  }

  try {
    const token = await getAccessToken();

    const query = `
      SELECT
        lead_form_submission_data.id,
        lead_form_submission_data.gclid,
        lead_form_submission_data.campaign,
        lead_form_submission_data.ad_group,
        lead_form_submission_data.submission_date_time,
        lead_form_submission_data.lead_form_submission_fields
      FROM lead_form_submission_data
      ORDER BY lead_form_submission_data.submission_date_time DESC
      LIMIT 500
    `;

    const res = await fetchWithRetry(() =>
      axios.post(
        `${GOOGLE_API_BASE}/customers/${CUSTOMER_ID}/googleAds:search`,
        { query },
        { headers: googleAdsHeaders(token), timeout: 15000 }
      )
    );

    const submissions = res.data.results || [];
    let newCount = 0;

    for (const row of submissions) {
      const sub = row.leadFormSubmissionData;
      const submissionId = sub.id || sub.gclid;
      if (!submissionId) continue;

      const existing = await Lead.findOne({ platformLeadId: submissionId });
      if (existing) continue;

      const fields = {};
      (sub.leadFormSubmissionFields || []).forEach((f) => {
        fields[f.fieldType?.toLowerCase() || f.questionId] = f.fieldValue;
      });

      const campaignResourceName = sub.campaign;
      const campaignId = campaignResourceName?.split('/').pop();
      let campaignDoc = null;
      if (campaignId) {
        campaignDoc = await Campaign.findOne({ platformCampaignId: campaignId });
        if (!campaignDoc) {
          campaignDoc = await Campaign.create({
            platformCampaignId: campaignId,
            name: `Google Campaign ${campaignId}`,
            platform: 'google',
            service: 'Digital Marketing',
            status: 'active',
            startDate: new Date(),
          });
        }
      }

      await Lead.create({
        platformLeadId: submissionId,
        name: fields['full_name'] || fields['FULL_NAME'] || 'Unknown',
        email: fields['email'] || fields['EMAIL'] || '',
        phone: fields['phone_number'] || fields['PHONE_NUMBER'] || '',
        source: 'google',
        campaignId: campaignDoc?._id || null,
        service: detectService(fields),
        status: 'new',
        receivedAt: sub.submissionDateTime ? new Date(sub.submissionDateTime) : new Date(),
        createdAt: new Date(),
      });

      newCount++;
    }

    await SyncLog.create({
      platform: 'google',
      status: 'success',
      message: `Synced ${newCount} new leads`,
      timestamp: new Date(),
    });

    return { success: true, newLeads: newCount };
  } catch (err) {
    await SyncLog.create({
      platform: 'google',
      status: 'failed',
      message: err.response?.data?.error?.message || err.message,
      timestamp: new Date(),
    });
    return { success: false, error: err.message };
  }
}

// Sync Google Ads metrics
export async function syncGoogleMetrics() {
  await connectDB();

  if (!DEVELOPER_TOKEN || !CLIENT_ID || !REFRESH_TOKEN || !CUSTOMER_ID) {
    return { success: false, message: 'Missing configuration' };
  }

  try {
    const token = await getAccessToken();

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date DESC
      LIMIT 1000
    `;

    const res = await fetchWithRetry(() =>
      axios.post(
        `${GOOGLE_API_BASE}/customers/${CUSTOMER_ID}/googleAds:search`,
        { query },
        { headers: googleAdsHeaders(token), timeout: 15000 }
      )
    );

    const rows = res.data.results || [];
    let synced = 0;

    for (const row of rows) {
      const campaignId = row.campaign.id;
      const spend = (row.metrics.costMicros || 0) / 1_000_000;
      const conversions = parseInt(row.metrics.conversions || 0, 10);

      let campaignDoc = await Campaign.findOne({ platformCampaignId: campaignId });
      if (!campaignDoc) {
        campaignDoc = await Campaign.create({
          platformCampaignId: campaignId,
          name: row.campaign.name,
          platform: 'google',
          service: 'Digital Marketing',
          status: row.campaign.status?.toLowerCase() === 'enabled' ? 'active' : 'paused',
          startDate: new Date(),
        });
      }

      const date = new Date(row.segments.date);

      await AdMetric.findOneAndUpdate(
        { campaignId: campaignDoc._id, date },
        {
          campaignId: campaignDoc._id,
          date,
          impressions: parseInt(row.metrics.impressions || 0, 10),
          clicks: parseInt(row.metrics.clicks || 0, 10),
          ctr: parseFloat(row.metrics.ctr || 0) * 100,
          cpc: (row.metrics.averageCpc || 0) / 1_000_000,
          spend,
          conversions,
          costPerLead: conversions > 0 ? spend / conversions : 0,
          syncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      synced++;
    }

    await SyncLog.create({
      platform: 'google_metrics',
      status: 'success',
      message: `Synced ${synced} metric rows`,
      timestamp: new Date(),
    });

    return { success: true, rows: synced };
  } catch (err) {
    await SyncLog.create({
      platform: 'google_metrics',
      status: 'failed',
      message: err.response?.data?.error?.message || err.message,
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
