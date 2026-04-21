import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SocialLead from '@/models/SocialLead';
import LeadTimeline from '@/models/LeadTimeline';
import LeadRemark from '@/models/LeadRemark';
import OutreachEmail from '@/models/OutreachEmail';
import OutreachCall from '@/models/OutreachCall';
import '@/models/Company';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import mongoose from 'mongoose';

// ─── GET — list social leads ──────────────────────────────────────────────────
export const GET = withPermission('leads.social.view', async (req, _ctx, session) => {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;

  const isAdmin = session.user.role === 'admin';
  const perms = session.user.permissions || [];
  const canViewAll =
    isAdmin ||
    perms.includes('*') ||
    perms.includes('leads.social.view.all');

  const filter = {};

  // Scope to own leads unless user has view.all permission
  // ?mine=true forces own-only even for users with view.all
  const forceOwn = searchParams.get('mine') === 'true';
  if (!canViewAll || forceOwn) {
    filter.$or = [
      { owner_user_id: session.user.id },
      { assigned_to: session.user.id },
      { created_by: session.user.id },
    ];
  }

  // Search
  const search = searchParams.get('search')?.trim();
  if (search) {
    filter.customer_id_url = { $regex: search, $options: 'i' };
  }

  // Filters from query params
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  if (searchParams.get('platform')) filter.platform_id = searchParams.get('platform');
  if (searchParams.get('company')) filter.company_id = searchParams.get('company');
  if (searchParams.get('niche')) filter.target_niche_id = searchParams.get('niche');
  if (searchParams.get('assignedTo')) filter.assigned_to = searchParams.get('assignedTo');
  if (searchParams.get('createdBy')) filter.created_by = searchParams.get('createdBy');
  if (searchParams.get('startDate') || searchParams.get('endDate')) {
    filter.createdAt = {};
    if (searchParams.get('startDate')) filter.createdAt.$gte = new Date(searchParams.get('startDate'));
    if (searchParams.get('endDate')) {
      const end = new Date(searchParams.get('endDate'));
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [total, leads] = await Promise.all([
    SocialLead.countDocuments(filter),
    SocialLead.find(filter)
      .populate('platform_id', 'name icon_slug')
      .populate('social_account_id', 'account_name')
      .populate('target_niche_id', 'name')
      .populate('assigned_to', 'name email')
      .populate('owner_user_id', 'name email')
      .populate('created_by', 'name')
      .populate({ path: 'company_id', select: 'name', strictPopulate: false })
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  // Attach last remark + outreach status to each lead
  const leadIds = leads.map((l) => l._id);
  const [lastRemarks, emailsSent, callsLogged] = await Promise.all([
    LeadRemark.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'social' } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$lead_id', remark_text: { $first: '$remark_text' }, createdAt: { $first: '$createdAt' } } },
    ]),
    OutreachEmail.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'social' } },
      { $group: { _id: '$lead_id', count: { $sum: 1 }, last_sent_at: { $max: '$sent_at' } } },
    ]),
    OutreachCall.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'social' } },
      { $group: { _id: '$lead_id', count: { $sum: 1 }, last_outcome: { $last: '$outcome' } } },
    ]),
  ]);

  const remarkMap = Object.fromEntries(lastRemarks.map((r) => [r._id.toString(), r]));
  const emailMap = Object.fromEntries(emailsSent.map((r) => [r._id.toString(), r]));
  const callMap = Object.fromEntries(callsLogged.map((r) => [r._id.toString(), r]));

  const enriched = leads.map((l) => ({
    ...l,
    last_remark: remarkMap[l._id.toString()] || null,
    outreach: {
      emails_sent: emailMap[l._id.toString()]?.count || 0,
      last_email_at: emailMap[l._id.toString()]?.last_sent_at || null,
      calls_made: callMap[l._id.toString()]?.count || 0,
      last_call_outcome: callMap[l._id.toString()]?.last_outcome || null,
    },
  }));

  return NextResponse.json({ leads: enriched, total, page, pages: Math.ceil(total / pageSize) });
});

// ─── POST — create social lead ────────────────────────────────────────────────
export const POST = withPermission('leads.social.create', async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();
  const { platform_id, social_account_id, target_niche_id, customer_id_url, initial_remark } = body;

  if (!platform_id || !social_account_id || !customer_id_url) {
    return NextResponse.json({ error: 'platform_id, social_account_id, customer_id_url are required' }, { status: 400 });
  }

  const lead = await SocialLead.create({
    platform_id,
    social_account_id,
    target_niche_id: target_niche_id || null,
    customer_id_url: customer_id_url.trim(),
    created_by: session.user.id,
    company_id: session.user.company_id || null,
    status: 'new',
  });

  // Timeline: lead_created
  await LeadTimeline.create({
    lead_id: lead._id,
    lead_type: 'social',
    event_type: 'lead_created',
    event_data: { customer_id_url },
    created_by: session.user.id,
  });

  // First remark (optional)
  if (initial_remark?.trim()) {
    await LeadRemark.create({
      lead_id: lead._id,
      lead_type: 'social',
      remark_text: initial_remark.trim(),
      created_by: session.user.id,
    });
    await LeadTimeline.create({
      lead_id: lead._id,
      lead_type: 'social',
      event_type: 'remark_added',
      event_data: { preview: initial_remark.substring(0, 100) },
      created_by: session.user.id,
    });
  }

  await writeAudit({
    event_type: 'lead.created',
    entity_type: 'lead_social',
    entity_id: lead._id,
    actor_user_id: session.user.id,
    metadata: { customer_id_url },
  });

  return NextResponse.json(lead, { status: 201 });
});

// ─── DELETE — bulk delete (admin only) ───────────────────────────────────────
export const DELETE = withPermission('leads.social.view', async (req, _ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  await connectDB();
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  await Promise.all([
    SocialLead.deleteMany({ _id: { $in: objectIds } }),
    LeadRemark.deleteMany({ lead_id: { $in: objectIds } }),
    LeadTimeline.deleteMany({ lead_id: { $in: objectIds } }),
  ]);

  await writeAudit({
    event_type: 'lead.deleted',
    entity_type: 'lead_social',
    entity_id: ids[0],
    actor_user_id: session.user.id,
    metadata: { count: ids.length, bulk: true },
  });

  return NextResponse.json({ success: true, deleted: ids.length });
});
