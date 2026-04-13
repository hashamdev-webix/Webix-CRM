import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SocialLead from '@/models/SocialLead';
import DataEntryLead from '@/models/DataEntryLead';
import OutreachEmail from '@/models/OutreachEmail';
import OutreachCall from '@/models/OutreachCall';
import FollowUp from '@/models/FollowUp';
import User from '@/models/User';
import Company from '@/models/Company';
import { withPermission } from '@/lib/permissions';

export const GET = withPermission('reports.view', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report') || 'overview';

  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : null;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = startDate;
  if (endDate) dateFilter.$lte = endDate;
  const createdAtFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  if (report === 'overview') {
    const [socialByStatus, dataentryByStatus, socialByPlatform, dataentryByContact] = await Promise.all([
      SocialLead.aggregate([
        { $match: createdAtFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DataEntryLead.aggregate([
        { $match: createdAtFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SocialLead.aggregate([
        { $match: createdAtFilter },
        { $lookup: { from: 'platforms', localField: 'platform_id', foreignField: '_id', as: 'platform' } },
        { $unwind: { path: '$platform', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$platform.name', count: { $sum: 1 } } },
      ]),
      DataEntryLead.aggregate([
        { $match: createdAtFilter },
        { $group: { _id: '$contact_type', count: { $sum: 1 } } },
      ]),
    ]);
    return NextResponse.json({ socialByStatus, dataentryByStatus, socialByPlatform, dataentryByContact });
  }

  if (report === 'performance') {
    const users = await User.find({ isActive: true }).select('name email role').lean();

    const stats = await Promise.all(
      users.map(async (u) => {
        const uid = u._id;
        const [
          totalSocial, activeSocial, wonSocial,
          totalDE, activeDE, wonDE,
          emailsSent, callsMade,
          followUpsCreated, followUpsCompleted,
        ] = await Promise.all([
          SocialLead.countDocuments({ owner_user_id: uid, ...createdAtFilter }),
          SocialLead.countDocuments({ owner_user_id: uid, status: 'active', ...createdAtFilter }),
          SocialLead.countDocuments({ owner_user_id: uid, status: 'won', ...createdAtFilter }),
          DataEntryLead.countDocuments({ owner_user_id: uid, ...createdAtFilter }),
          DataEntryLead.countDocuments({ owner_user_id: uid, status: 'active', ...createdAtFilter }),
          DataEntryLead.countDocuments({ owner_user_id: uid, status: 'won', ...createdAtFilter }),
          OutreachEmail.countDocuments({ sent_by: uid, ...(Object.keys(dateFilter).length ? { sent_at: dateFilter } : {}) }),
          OutreachCall.countDocuments({ called_by: uid, ...(Object.keys(dateFilter).length ? { called_at: dateFilter } : {}) }),
          FollowUp.countDocuments({ assigned_to: uid }),
          FollowUp.countDocuments({ assigned_to: uid, completed_at: { $ne: null } }),
        ]);

        return {
          user: { id: uid, name: u.name, email: u.email },
          totalLeads: totalSocial + totalDE,
          active: activeSocial + activeDE,
          won: wonSocial + wonDE,
          emailsSent,
          callsMade,
          followUpsCompliance: followUpsCreated > 0
            ? Math.round((followUpsCompleted / followUpsCreated) * 100)
            : 100,
        };
      })
    );

    return NextResponse.json(stats);
  }

  if (report === 'company') {
    const companies = await Company.find({ is_active: true }).lean();

    const stats = await Promise.all(
      companies.map(async (c) => {
        const cid = c._id;
        const [socialByStatus, dataentryByStatus, emailsSent, callsMade] = await Promise.all([
          SocialLead.aggregate([
            { $match: { company_id: cid, ...createdAtFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
          DataEntryLead.aggregate([
            { $match: { company_id: cid, ...createdAtFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
          OutreachEmail.countDocuments({
            ...(Object.keys(dateFilter).length ? { sent_at: dateFilter } : {}),
          }),
          OutreachCall.countDocuments({
            ...(Object.keys(dateFilter).length ? { called_at: dateFilter } : {}),
          }),
        ]);

        const totalSocial = socialByStatus.reduce((s, r) => s + r.count, 0);
        const totalDE = dataentryByStatus.reduce((s, r) => s + r.count, 0);
        const wonSocial = socialByStatus.find((r) => r._id === 'won')?.count || 0;
        const wonDE = dataentryByStatus.find((r) => r._id === 'won')?.count || 0;
        const activeSocial = socialByStatus.find((r) => r._id === 'active')?.count || 0;
        const activeDE = dataentryByStatus.find((r) => r._id === 'active')?.count || 0;

        // Merge status breakdown
        const statusMap = {};
        [...socialByStatus, ...dataentryByStatus].forEach((r) => {
          statusMap[r._id] = (statusMap[r._id] || 0) + r.count;
        });
        const byStatus = Object.entries(statusMap).map(([_id, count]) => ({ _id, count }));

        return {
          company: { id: cid, name: c.name },
          totalLeads: totalSocial + totalDE,
          socialLeads: totalSocial,
          dataEntryLeads: totalDE,
          won: wonSocial + wonDE,
          active: activeSocial + activeDE,
          byStatus,
        };
      })
    );

    // Sort by total leads desc
    stats.sort((a, b) => b.totalLeads - a.totalLeads);
    return NextResponse.json(stats);
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
});
