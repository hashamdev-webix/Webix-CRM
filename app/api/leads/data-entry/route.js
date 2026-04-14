import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DataEntryLead from '@/models/DataEntryLead';
import LeadTimeline from '@/models/LeadTimeline';
import LeadRemark from '@/models/LeadRemark';
import OutreachEmail from '@/models/OutreachEmail';
import OutreachCall from '@/models/OutreachCall';
import '@/models/Company';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// ─── GET list ─────────────────────────────────────────────────────────────────
export const GET = withPermission('leads.dataentry.view', async (req, _ctx, session) => {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;

  const isAdmin = session.user.role === 'admin';
  const perms = session.user.permissions || [];
  const canViewAll = isAdmin || perms.includes('*') || perms.includes('leads.dataentry.view.all');

  const filter = {};
  // ?mine=true forces own-only even for users with view.all
  const forceOwn = searchParams.get('mine') === 'true';
  if (!canViewAll || forceOwn) {
    filter.$or = [
      { owner_user_id: session.user.id },
      { assigned_to: session.user.id },
      { created_by: session.user.id },
    ];
  }

  // Filters
  const contactType = searchParams.get('contact_type');
  if (contactType) filter.contact_type = contactType;
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  if (searchParams.get('company')) filter.company_id = searchParams.get('company');
  if (searchParams.get('assignedTo')) filter.assigned_to = searchParams.get('assignedTo');
  if (searchParams.get('startDate') || searchParams.get('endDate')) {
    filter.createdAt = {};
    if (searchParams.get('startDate')) filter.createdAt.$gte = new Date(searchParams.get('startDate'));
    if (searchParams.get('endDate')) filter.createdAt.$lte = new Date(searchParams.get('endDate'));
  }

  const [total, leads] = await Promise.all([
    DataEntryLead.countDocuments(filter),
    DataEntryLead.find(filter)
      .populate('owner_user_id', 'name email')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .populate({ path: 'company_id', select: 'name', strictPopulate: false })
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  // Attach last remark + outreach status
  const leadIds = leads.map((l) => l._id);
  const [lastRemarks, emailsSent, callsLogged] = await Promise.all([
    LeadRemark.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'dataentry' } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$lead_id', remark_text: { $first: '$remark_text' } } },
    ]),
    OutreachEmail.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'dataentry' } },
      { $group: { _id: '$lead_id', count: { $sum: 1 }, last_sent_at: { $max: '$sent_at' } } },
    ]),
    OutreachCall.aggregate([
      { $match: { lead_id: { $in: leadIds }, lead_type: 'dataentry' } },
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

// ─── POST create ─────────────────────────────────────────────────────────────
export const POST = withPermission('leads.dataentry.create', async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();
  const { business_name, phone_number, email_address } = body;

  if (!business_name?.trim()) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 });
  }
  if (!phone_number?.trim() && !email_address?.trim()) {
    return NextResponse.json({ error: 'At least one of phone_number or email_address is required' }, { status: 400 });
  }

  // Derive contact_type
  const hasPhone = !!phone_number?.trim();
  const hasEmail = !!email_address?.trim();
  const contact_type = hasPhone && hasEmail ? 'both' : hasPhone ? 'phone' : 'email';

  const lead = await DataEntryLead.create({
    ...body,
    contact_type,
    created_by: session.user.id,
    company_id: session.user.company_id || null,
    status: 'new',
  });

  await LeadTimeline.create({
    lead_id: lead._id,
    lead_type: 'dataentry',
    event_type: 'lead_created',
    event_data: { business_name, contact_type },
    created_by: session.user.id,
  });

  if (body.initial_remark?.trim()) {
    await LeadRemark.create({
      lead_id: lead._id,
      lead_type: 'dataentry',
      remark_text: body.initial_remark.trim(),
      created_by: session.user.id,
    });
  }

  await writeAudit({
    event_type: 'lead.created',
    entity_type: 'lead_dataentry',
    entity_id: lead._id,
    actor_user_id: session.user.id,
    metadata: { business_name, contact_type },
  });

  return NextResponse.json(lead, { status: 201 });
});
