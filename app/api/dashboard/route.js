export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import AdMetric from '@/models/AdMetric';
import Campaign from '@/models/Campaign';

// Cache in memory for 15 minutes
let cache = { data: null, expiresAt: 0 };

export async function GET(req) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  // Return cached stats if still valid
  if (cache.data && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  try {
    await connectDB();

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [leadsToday, leadsWeek, leadsMonth, activeCampaigns, recentLeads] = await Promise.all([
      Lead.countDocuments({ receivedAt: { $gte: startOfDay } }),
      Lead.countDocuments({ receivedAt: { $gte: startOfWeek } }),
      Lead.countDocuments({ receivedAt: { $gte: startOfMonth } }),
      Campaign.countDocuments({ status: 'active' }),
      Lead.find()
        .sort({ receivedAt: -1 })
        .limit(20)
        .populate('campaignId', 'name platform')
        .populate('assignedTo', 'name email')
        .lean(),
    ]);

    // Ad spend (last 30 days) — admin only
    let totalSpend = 0;
    let conversionRate = 0;

    if (session.user.role === 'admin') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const spendAgg = await AdMetric.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, totalSpend: { $sum: '$spend' }, totalConversions: { $sum: '$conversions' } } },
      ]);
      if (spendAgg.length > 0) {
        totalSpend = spendAgg[0].totalSpend;
        const totalConversions = spendAgg[0].totalConversions;
        conversionRate = leadsMonth > 0 ? (totalConversions / leadsMonth) * 100 : 0;
      }
    }

    // Leads over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsOverTime = await Lead.aggregate([
      { $match: { receivedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$receivedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Leads by platform
    const leadsByPlatform = await Lead.aggregate([
      { $match: { receivedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);

    // Leads by service
    const leadsByService = await Lead.aggregate([
      { $match: { receivedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$service', count: { $sum: 1 } } },
    ]);

    // Ad spend over time (admin only)
    let spendOverTime = [];
    if (session.user.role === 'admin') {
      spendOverTime = await AdMetric.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            spend: { $sum: '$spend' },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    const data = {
      summary: {
        leadsToday,
        leadsWeek,
        leadsMonth,
        totalSpend: session.user.role === 'admin' ? totalSpend : null,
        conversionRate: session.user.role === 'admin' ? conversionRate : null,
        activeCampaigns,
      },
      charts: {
        leadsOverTime: leadsOverTime.map((d) => ({ date: d._id, count: d.count })),
        leadsByPlatform: leadsByPlatform.map((d) => ({ platform: d._id, count: d.count })),
        leadsByService: leadsByService.map((d) => ({ service: d._id, count: d.count })),
        spendOverTime:
          session.user.role === 'admin'
            ? spendOverTime.map((d) => ({ date: d._id, spend: d.spend }))
            : [],
      },
      recentLeads,
    };

    // Cache for 15 minutes
    cache = { data, expiresAt: Date.now() + 15 * 60 * 1000 };

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Dashboard API]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
