import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeadTimeline from '@/models/LeadTimeline';
import { withPermission } from '@/lib/permissions';

export const GET = withPermission('leads.social.view', async (req, { params }) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;

  const [total, events] = await Promise.all([
    LeadTimeline.countDocuments({ lead_id: params.id, lead_type: 'social' }),
    LeadTimeline.find({ lead_id: params.id, lead_type: 'social' })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return NextResponse.json({ events, total, page, pages: Math.ceil(total / limit) });
});
