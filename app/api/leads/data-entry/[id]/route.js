import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DataEntryLead from '@/models/DataEntryLead';
import LeadTimeline from '@/models/LeadTimeline';
import LeadRemark from '@/models/LeadRemark';
import { withPermission } from '@/lib/permissions';
import { applyStatusChange, canChangeStatus } from '@/lib/lead-status';
import { writeAudit } from '@/lib/audit';

export const GET = withPermission('leads.dataentry.view', async (req, { params }) => {
  await connectDB();
  const lead = await DataEntryLead.findById(params.id)
    .populate('owner_user_id', 'name email')
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name email')
    .lean();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json(lead);
});

export const PATCH = withPermission('leads.dataentry.edit', async (req, { params }, session) => {
  await connectDB();
  const body = await req.json();
  const lead = await DataEntryLead.findById(params.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (body.status && body.status !== lead.status) {
    const { allowed, reason } = canChangeStatus({
      lead,
      userId: session.user.id,
      userRole: session.user.role,
    });
    if (!allowed) return NextResponse.json({ error: reason }, { status: 403 });

    await applyStatusChange({
      lead,
      leadType: 'dataentry',
      newStatus: body.status,
      userId: session.user.id,
      notes: body.status_notes || '',
    });
  }

  if (body.assigned_to !== undefined && session.user.role === 'admin') {
    const prev = lead.assigned_to?.toString();
    lead.assigned_to = body.assigned_to || null;
    if (prev !== body.assigned_to) {
      await LeadTimeline.create({
        lead_id: lead._id,
        lead_type: 'dataentry',
        event_type: 'lead_reassigned',
        event_data: { from: prev, to: body.assigned_to },
        created_by: session.user.id,
      });
      await writeAudit({
        event_type: 'lead.reassigned',
        entity_type: 'lead_dataentry',
        entity_id: lead._id,
        actor_user_id: session.user.id,
        metadata: { from: prev, to: body.assigned_to },
      });
    }
  }

  await lead.save();
  return NextResponse.json(lead);
});

// ─── DELETE — admin only ──────────────────────────────────────────────────────
export const DELETE = withPermission('leads.dataentry.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  await connectDB();
  const lead = await DataEntryLead.findByIdAndDelete(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Promise.all([
    LeadRemark.deleteMany({ lead_id: params.id }),
    LeadTimeline.deleteMany({ lead_id: params.id }),
  ]);

  await writeAudit({
    event_type: 'lead.deleted',
    entity_type: 'lead_dataentry',
    entity_id: params.id,
    actor_user_id: session.user.id,
    metadata: { business_name: lead.business_name },
  });

  return NextResponse.json({ success: true });
});
