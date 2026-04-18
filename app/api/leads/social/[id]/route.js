import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SocialLead from '@/models/SocialLead';
import LeadRemark from '@/models/LeadRemark';
import LeadTimeline from '@/models/LeadTimeline';
import { withPermission } from '@/lib/permissions';
import { applyStatusChange, canChangeStatus } from '@/lib/lead-status';
import { writeAudit } from '@/lib/audit';

export const GET = withPermission('leads.social.view', async (req, { params }, session) => {
  await connectDB();
  const lead = await SocialLead.findById(params.id)
    .populate('platform_id', 'name icon_slug type')
    .populate('social_account_id', 'account_name account_url')
    .populate('target_niche_id', 'name')
    .populate('assigned_to', 'name email')
    .populate('owner_user_id', 'name email')
    .populate('created_by', 'name email')
    .lean();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json(lead);
});

export const PATCH = withPermission('leads.social.edit', async (req, { params }, session) => {
  await connectDB();
  const body = await req.json();
  const lead = await SocialLead.findById(params.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Status change — goes through the status engine
  if (body.status && body.status !== lead.status) {
    const { allowed, reason } = canChangeStatus({
      lead,
      userId: session.user.id,
      userRole: session.user.role,
    });
    if (!allowed) return NextResponse.json({ error: reason }, { status: 403 });

    await applyStatusChange({
      lead,
      leadType: 'social',
      newStatus: body.status,
      userId: session.user.id,
      notes: body.status_notes || '',
    });
  }

  // Admin-only: reassign
  if (body.assigned_to !== undefined && session.user.role === 'admin') {
    const prev = lead.assigned_to?.toString();
    lead.assigned_to = body.assigned_to || null;
    if (prev !== body.assigned_to) {
      const { default: LeadTimeline } = await import('@/models/LeadTimeline');
      await LeadTimeline.create({
        lead_id: lead._id,
        lead_type: 'social',
        event_type: 'lead_reassigned',
        event_data: { from: prev, to: body.assigned_to },
        created_by: session.user.id,
      });
      await writeAudit({
        event_type: 'lead.reassigned',
        entity_type: 'lead_social',
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
export const DELETE = withPermission('leads.social.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  await connectDB();
  const lead = await SocialLead.findByIdAndDelete(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Clean up related records
  await Promise.all([
    LeadRemark.deleteMany({ lead_id: params.id }),
    LeadTimeline.deleteMany({ lead_id: params.id }),
  ]);

  await writeAudit({
    event_type: 'lead.deleted',
    entity_type: 'lead_social',
    entity_id: params.id,
    actor_user_id: session.user.id,
    metadata: { customer_id_url: lead.customer_id_url },
  });

  return NextResponse.json({ success: true });
});
