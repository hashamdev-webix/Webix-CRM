import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DataEntryLead from '@/models/DataEntryLead';
import LeadTimeline from '@/models/LeadTimeline';
import LeadStatusHistory from '@/models/LeadStatusHistory';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const PATCH = withPermission('leads.dataentry.edit', async (req, { params }, session) => {
  await connectDB();
  const lead = await DataEntryLead.findById(params.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (lead.status !== 'new') {
    return NextResponse.json({ error: 'Outreach can only be started on new leads' }, { status: 400 });
  }

  const prev = lead.status;
  lead.status = 'active';
  lead.owner_user_id = session.user.id;
  lead.locked_at = new Date();
  await lead.save();

  await Promise.all([
    LeadStatusHistory.create({
      lead_id: lead._id,
      lead_type: 'dataentry',
      previous_status: prev,
      new_status: 'active',
      changed_by: session.user.id,
      notes: 'Outreach started',
    }),
    LeadTimeline.create({
      lead_id: lead._id,
      lead_type: 'dataentry',
      event_type: 'outreach_started',
      event_data: {},
      created_by: session.user.id,
    }),
    LeadTimeline.create({
      lead_id: lead._id,
      lead_type: 'dataentry',
      event_type: 'lead_locked',
      event_data: { owner: session.user.id },
      created_by: session.user.id,
    }),
  ]);

  await writeAudit({
    event_type: 'lead.status_changed',
    entity_type: 'lead_dataentry',
    entity_id: lead._id,
    actor_user_id: session.user.id,
    metadata: { from: prev, to: 'active', trigger: 'start_outreach' },
  });

  return NextResponse.json(lead);
});
