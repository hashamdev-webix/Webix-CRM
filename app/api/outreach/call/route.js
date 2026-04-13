import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OutreachCall from '@/models/OutreachCall';
import FollowUp from '@/models/FollowUp';
import LeadTimeline from '@/models/LeadTimeline';
import SocialLead from '@/models/SocialLead';
import DataEntryLead from '@/models/DataEntryLead';
import { withPermission } from '@/lib/permissions';
import { applyStatusChange } from '@/lib/lead-status';
import { writeAudit } from '@/lib/audit';

const FOLLOW_UP_OUTCOMES = ['follow_up_requested', 'no_answer'];

export const POST = withPermission('outreach.phone.log', async (req, _ctx, session) => {
  await connectDB();
  const { lead_id, lead_type, phone_option_id, script_id, outcome, notes } = await req.json();

  if (!lead_id || !lead_type || !outcome) {
    return NextResponse.json({ error: 'lead_id, lead_type, outcome are required' }, { status: 400 });
  }

  const LeadModel = lead_type === 'social' ? SocialLead : DataEntryLead;
  const lead = await LeadModel.findById(lead_id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const now = new Date();

  const call = await OutreachCall.create({
    lead_id,
    lead_type,
    phone_option_id: phone_option_id || null,
    script_id: script_id || null,
    outcome,
    notes: notes || '',
    called_by: session.user.id,
    called_at: now,
  });

  // Activate lead on first call if still 'new'
  if (lead.status === 'new') {
    await applyStatusChange({ lead, leadType: lead_type, newStatus: 'active', userId: session.user.id });
  }
  await lead.save();

  await LeadTimeline.create({
    lead_id,
    lead_type,
    event_type: 'call_logged',
    event_data: { call_id: call._id, outcome, phone_option_id },
    created_by: session.user.id,
  });

  // Create follow-up if outcome warrants it
  let followUp = null;
  if (FOLLOW_UP_OUTCOMES.includes(outcome)) {
    followUp = await FollowUp.create({
      lead_id,
      lead_type,
      outreach_call_id: call._id,
      assigned_to: session.user.id,
      due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    await LeadTimeline.create({
      lead_id,
      lead_type,
      event_type: 'follow_up_created',
      event_data: { follow_up_id: followUp._id, due_at: followUp.due_at },
      created_by: session.user.id,
    });
    await writeAudit({
      event_type: 'follow_up.created',
      entity_type: 'follow_up',
      entity_id: followUp._id,
      actor_user_id: session.user.id,
      metadata: { lead_id, lead_type, trigger: 'call', outcome },
    });
  }

  await writeAudit({
    event_type: 'outreach.call_logged',
    entity_type: 'lead_' + lead_type,
    entity_id: lead_id,
    actor_user_id: session.user.id,
    metadata: { outcome, call_id: call._id },
  });

  return NextResponse.json({ call, followUp }, { status: 201 });
});

// GET — list calls for a lead
export const GET = withPermission('leads.dataentry.view', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const lead_id = searchParams.get('lead_id');
  const lead_type = searchParams.get('lead_type');
  if (!lead_id || !lead_type) return NextResponse.json({ error: 'lead_id and lead_type required' }, { status: 400 });

  const calls = await OutreachCall.find({ lead_id, lead_type })
    .populate('phone_option_id', 'label number')
    .populate('script_id', 'title')
    .populate('called_by', 'name email')
    .sort({ called_at: -1 })
    .lean();

  return NextResponse.json(calls);
});
