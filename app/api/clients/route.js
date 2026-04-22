import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ClientPayment from '@/models/ClientPayment';
import '@/models/Company';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// ─── GET — list clients ───────────────────────────────────────────────────────
export const GET = withPermission('clients.view', async (req, _ctx, session) => {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
  const sortBy   = searchParams.get('sortBy') || 'createdAt';
  const sortDir  = searchParams.get('sortDir') === 'asc' ? 1 : -1;

  const isAdmin   = session.user.role === 'admin';
  const perms     = session.user.permissions || [];
  const canViewAll = isAdmin || perms.includes('*') || perms.includes('clients.view.all');

  const filter = {};

  if (!canViewAll) {
    filter.$or = [
      { sales_person_id: session.user.id },
      { created_by: session.user.id },
    ];
  }

  // Filters
  const search = searchParams.get('search')?.trim();
  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { brand_name: { $regex: search, $options: 'i' } },
        { contact_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (searchParams.get('status'))  filter.status = searchParams.get('status');
  if (searchParams.get('service')) filter.services = { $in: [searchParams.get('service')] };
  if (searchParams.get('salesPerson')) filter.sales_person_id = searchParams.get('salesPerson');

  const [total, clients] = await Promise.all([
    Client.countDocuments(filter),
    Client.find(filter)
      .populate('sales_person_id', 'name email')
      .populate('created_by', 'name')
      .populate('departments_involved', 'name')
      .populate('pm_employee_id', 'firstName lastName')
      .populate('account_manager_id', 'firstName lastName')
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  // Attach payment totals
  const ids = clients.map(c => c._id);
  const paymentTotals = await ClientPayment.aggregate([
    { $match: { client_id: { $in: ids } } },
    { $group: { _id: '$client_id', total_received: { $sum: '$amount' } } },
  ]);
  const payMap = Object.fromEntries(paymentTotals.map(p => [p._id.toString(), p.total_received]));

  const enriched = clients.map(c => ({
    ...c,
    total_received:      payMap[c._id.toString()] || 0,
    outstanding_balance: (c.contract_value || 0) - (payMap[c._id.toString()] || 0),
  }));

  return NextResponse.json({ clients: enriched, total, page, pages: Math.ceil(total / pageSize) });
});

// ─── POST — create client ─────────────────────────────────────────────────────
export const POST = withPermission('clients.create', async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();

  const { brand_name, client_type, industry, contact_name, phone, lead_source, sales_person_id, conversion_date } = body;

  if (!brand_name?.trim())    return NextResponse.json({ error: 'brand_name is required' }, { status: 400 });
  if (!client_type)           return NextResponse.json({ error: 'client_type is required' }, { status: 400 });
  if (!industry?.trim())      return NextResponse.json({ error: 'industry is required' }, { status: 400 });
  if (!contact_name?.trim())  return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
  if (!phone?.trim())         return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  if (!lead_source)           return NextResponse.json({ error: 'lead_source is required' }, { status: 400 });
  if (!sales_person_id)       return NextResponse.json({ error: 'sales_person_id is required' }, { status: 400 });
  if (!conversion_date)       return NextResponse.json({ error: 'conversion_date is required' }, { status: 400 });

  const client = await Client.create({
    ...body,
    created_by: session.user.id,
    company_id: session.user.company_id || null,
    status: body.status || 'active',
  });

  await writeAudit({
    event_type: 'client.created',
    entity_type: 'client',
    entity_id: client._id,
    actor_user_id: session.user.id,
    metadata: { brand_name, client_type },
  });

  return NextResponse.json(client, { status: 201 });
});
