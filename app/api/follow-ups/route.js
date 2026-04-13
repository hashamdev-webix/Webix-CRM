import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FollowUp from '@/models/FollowUp';
import LeadTimeline from '@/models/LeadTimeline';
import { withAuth } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// GET — list follow-ups for the current user (due and overdue)
export const GET = withAuth(async (req, _ctx, session) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const includeCompleted = searchParams.get('includeCompleted') === 'true';

  const filter = {
    assigned_to: session.user.id,
    ...(includeCompleted ? {} : { completed_at: null }),
  };

  // Admin can see all follow-ups
  if (session.user.role === 'admin' && searchParams.get('all') === 'true') {
    delete filter.assigned_to;
  }

  const followUps = await FollowUp.find(filter)
    .populate('assigned_to', 'name email')
    .sort({ due_at: 1 })
    .lean();

  // Enrich with lead info
  const { default: SocialLead } = await import('@/models/SocialLead');
  const { default: DataEntryLead } = await import('@/models/DataEntryLead');

  const enriched = await Promise.all(
    followUps.map(async (fu) => {
      let lead = null;
      if (fu.lead_type === 'social') {
        lead = await SocialLead.findById(fu.lead_id)
          .select('customer_id_url status platform_id')
          .populate('platform_id', 'name')
          .lean();
      } else {
        lead = await DataEntryLead.findById(fu.lead_id)
          .select('business_name status contact_type')
          .lean();
      }
      return { ...fu, lead };
    })
  );

  return NextResponse.json(enriched);
});

// PATCH — mark follow-up complete
export const PATCH = withAuth(async (req, _ctx, session) => {
  await connectDB();
  const { follow_up_id } = await req.json();
  if (!follow_up_id) return NextResponse.json({ error: 'follow_up_id is required' }, { status: 400 });

  const fu = await FollowUp.findById(follow_up_id);
  if (!fu) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });

  // Only assignee or admin can complete
  if (fu.assigned_to.toString() !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  fu.completed_at = new Date();
  await fu.save();

  await LeadTimeline.create({
    lead_id: fu.lead_id,
    lead_type: fu.lead_type,
    event_type: 'follow_up_completed',
    event_data: { follow_up_id: fu._id },
    created_by: session.user.id,
  });

  await writeAudit({
    event_type: 'follow_up.completed',
    entity_type: 'follow_up',
    entity_id: fu._id,
    actor_user_id: session.user.id,
    metadata: { lead_id: fu.lead_id, lead_type: fu.lead_type },
  });

  return NextResponse.json(fu);
});
