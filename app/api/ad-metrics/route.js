export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AdMetric from '@/models/AdMetric';
import Campaign from '@/models/Campaign';

export async function GET(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate'))
      : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : new Date();
    const platform = searchParams.get('platform'); // 'meta' | 'google' | null

    // Find campaigns filtered by platform
    const campaignFilter = {};
    if (platform && platform !== 'both') campaignFilter.platform = platform;
    const campaigns = await Campaign.find(campaignFilter).select('_id').lean();
    const campaignIds = campaigns.map((c) => c._id);

    const metricsFilter = {
      date: { $gte: startDate, $lte: endDate },
      ...(campaignIds.length > 0 ? { campaignId: { $in: campaignIds } } : {}),
    };

    // Summary totals
    const [summary] = await AdMetric.aggregate([
      { $match: metricsFilter },
      {
        $group: {
          _id: null,
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          spend: { $sum: '$spend' },
          conversions: { $sum: '$conversions' },
        },
      },
      {
        $addFields: {
          ctr: {
            $cond: [{ $gt: ['$impressions', 0] }, { $divide: ['$clicks', '$impressions'] }, 0],
          },
          cpc: { $cond: [{ $gt: ['$clicks', 0] }, { $divide: ['$spend', '$clicks'] }, 0] },
          costPerLead: {
            $cond: [{ $gt: ['$conversions', 0] }, { $divide: ['$spend', '$conversions'] }, 0],
          },
        },
      },
    ]);

    // Per-campaign breakdown
    const perCampaign = await AdMetric.aggregate([
      { $match: metricsFilter },
      {
        $group: {
          _id: '$campaignId',
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          spend: { $sum: '$spend' },
          conversions: { $sum: '$conversions' },
        },
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: '_id',
          foreignField: '_id',
          as: 'campaign',
        },
      },
      { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          ctr: {
            $cond: [{ $gt: ['$impressions', 0] }, { $divide: ['$clicks', '$impressions'] }, 0],
          },
          cpc: { $cond: [{ $gt: ['$clicks', 0] }, { $divide: ['$spend', '$clicks'] }, 0] },
          costPerLead: {
            $cond: [{ $gt: ['$conversions', 0] }, { $divide: ['$spend', '$conversions'] }, 0],
          },
        },
      },
      { $sort: { spend: -1 } },
    ]);

    // Metrics over time (all metrics per day)
    const metricsOverTime = await AdMetric.aggregate([
      { $match: metricsFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          spend: { $sum: '$spend' },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          conversions: { $sum: '$conversions' },
        },
      },
      {
        $addFields: {
          ctr: { $cond: [{ $gt: ['$impressions', 0] }, { $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] }, 0] },
          cpc: { $cond: [{ $gt: ['$clicks', 0] }, { $divide: ['$spend', '$clicks'] }, 0] },
          cpl: { $cond: [{ $gt: ['$conversions', 0] }, { $divide: ['$spend', '$conversions'] }, 0] },
          // ROAS = conversions per $1000 spent (lead-gen interpretation)
          roas: { $cond: [{ $gt: ['$spend', 0] }, { $multiply: [{ $divide: ['$conversions', '$spend'] }, 1000] }, 0] },
          // ROI = estimated return assuming $1000 avg lead value
          roi: {
            $cond: [
              { $gt: ['$spend', 0] },
              { $multiply: [{ $divide: [{ $subtract: [{ $multiply: ['$conversions', 1000] }, '$spend'] }, '$spend'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Compute summary ROAS & ROI
    const s = summary || { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: 0, cpc: 0, costPerLead: 0 };
    const roas = s.spend > 0 ? (s.conversions / s.spend) * 1000 : 0;
    const roi = s.spend > 0 ? (((s.conversions * 1000) - s.spend) / s.spend) * 100 : 0;

    return NextResponse.json({
      summary: { ...s, roas, roi },
      perCampaign,
      metricsOverTime: metricsOverTime.map((d) => ({ date: d._id, ...d })),
      // keep spendOverTime alias for dashboard chart
      spendOverTime: metricsOverTime.map((d) => ({ date: d._id, spend: d.spend })),
    });
  } catch (err) {
    console.error('[AdMetrics GET]', err);
    return NextResponse.json({ error: 'Failed to fetch ad metrics' }, { status: 500 });
  }
}
