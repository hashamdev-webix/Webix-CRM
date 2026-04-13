import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OutreachEmailReply from '@/models/OutreachEmailReply';
import OutreachEmail from '@/models/OutreachEmail';
import LeadTimeline from '@/models/LeadTimeline';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const POST = withPermission('outreach.email.send', async (req, _ctx, session) => {
  await connectDB();
  const { outreach_email_id, reply_text } = await req.json();

  if (!outreach_email_id || !reply_text?.trim()) {
    return NextResponse.json({ error: 'outreach_email_id and reply_text are required' }, { status: 400 });
  }

  const outreachEmail = await OutreachEmail.findById(outreach_email_id);
  if (!outreachEmail) return NextResponse.json({ error: 'Outreach email not found' }, { status: 404 });

  const reply = await OutreachEmailReply.create({
    outreach_email_id,
    reply_text: reply_text.trim(),
    logged_by: session.user.id,
    logged_at: new Date(),
  });

  await LeadTimeline.create({
    lead_id: outreachEmail.lead_id,
    lead_type: outreachEmail.lead_type,
    event_type: 'email_reply_logged',
    event_data: { outreach_email_id, preview: reply_text.substring(0, 200) },
    created_by: session.user.id,
  });

  await writeAudit({
    event_type: 'outreach.reply_logged',
    entity_type: 'lead_' + outreachEmail.lead_type,
    entity_id: outreachEmail.lead_id,
    actor_user_id: session.user.id,
    metadata: { outreach_email_id },
  });

  return NextResponse.json(reply, { status: 201 });
});
