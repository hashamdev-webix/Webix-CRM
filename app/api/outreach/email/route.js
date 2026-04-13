import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OutreachEmail from '@/models/OutreachEmail';
import FollowUp from '@/models/FollowUp';
import LeadTimeline from '@/models/LeadTimeline';
import SocialLead from '@/models/SocialLead';
import DataEntryLead from '@/models/DataEntryLead';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { applyStatusChange } from '@/lib/lead-status';

export const POST = withPermission('outreach.email.send', async (req, _ctx, session) => {
  await connectDB();
  const { lead_id, lead_type, message_body } = await req.json();

  if (!lead_id || !lead_type || !message_body?.trim()) {
    return NextResponse.json({ error: 'lead_id, lead_type, message_body are required' }, { status: 400 });
  }

  const LeadModel = lead_type === 'social' ? SocialLead : DataEntryLead;
  const lead = await LeadModel.findById(lead_id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const now = new Date();

  // Record the outreach email (manual log — no SMTP sending)
  const outreachEmail = await OutreachEmail.create({
    lead_id,
    lead_type,
    message_body,
    sent_by: session.user.id,
    sent_at: now,
  });

  // If lead is 'new', activate and lock to sender
  if (lead.status === 'new') {
    await applyStatusChange({ lead, leadType: lead_type, newStatus: 'active', userId: session.user.id });
  }
  await lead.save();

  await LeadTimeline.create({
    lead_id,
    lead_type,
    event_type: 'email_sent',
    event_data: {
      outreach_email_id: outreachEmail._id,
      message_preview: message_body.substring(0, 200),
    },
    created_by: session.user.id,
  });

  // Schedule follow-up: due 24h from now
  const followUp = await FollowUp.create({
    lead_id,
    lead_type,
    outreach_email_id: outreachEmail._id,
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
    event_type: 'outreach.email_sent',
    entity_type: 'lead_' + lead_type,
    entity_id: lead_id,
    actor_user_id: session.user.id,
    metadata: { outreach_email_id: outreachEmail._id },
  });

  return NextResponse.json({ outreachEmail, followUp }, { status: 201 });
});

// GET — list outreach emails for a lead
export const GET = withPermission('leads.social.view', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const lead_id = searchParams.get('lead_id');
  const lead_type = searchParams.get('lead_type');
  if (!lead_id || !lead_type) return NextResponse.json({ error: 'lead_id and lead_type required' }, { status: 400 });

  const emails = await OutreachEmail.find({ lead_id, lead_type })
    .populate('sent_by', 'name email')
    .sort({ sent_at: -1 })
    .lean();

  return NextResponse.json(emails);
});
