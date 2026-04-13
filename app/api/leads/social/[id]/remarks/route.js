import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeadRemark from '@/models/LeadRemark';
import LeadTimeline from '@/models/LeadTimeline';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const GET = withPermission('leads.social.view', async (req, { params }) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;

  const [total, remarks] = await Promise.all([
    LeadRemark.countDocuments({ lead_id: params.id, lead_type: 'social' }),
    LeadRemark.find({ lead_id: params.id, lead_type: 'social' })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return NextResponse.json({ remarks, total, page, pages: Math.ceil(total / limit) });
});

export const POST = withPermission('leads.social.edit', async (req, { params }, session) => {
  await connectDB();
  const { remark_text } = await req.json();
  if (!remark_text?.trim()) {
    return NextResponse.json({ error: 'remark_text is required' }, { status: 400 });
  }

  const remark = await LeadRemark.create({
    lead_id: params.id,
    lead_type: 'social',
    remark_text: remark_text.trim(),
    created_by: session.user.id,
  });

  await LeadTimeline.create({
    lead_id: params.id,
    lead_type: 'social',
    event_type: 'remark_added',
    event_data: { preview: remark_text.substring(0, 100) },
    created_by: session.user.id,
  });

  await writeAudit({
    event_type: 'lead.remark_added',
    entity_type: 'lead_social',
    entity_id: params.id,
    actor_user_id: session.user.id,
  });

  const populated = await remark.populate('created_by', 'name email');
  return NextResponse.json(populated, { status: 201 });
});
