import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ClientPayment from '@/models/ClientPayment';
import '@/models/Department';
import '@/models/Employee';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import mongoose from 'mongoose';

// ─── GET — single client ──────────────────────────────────────────────────────
export const GET = withPermission('clients.view', async (req, { params }) => {
  await connectDB();
  const { id } = await params;

  const client = await Client.findById(id)
    .populate('sales_person_id', 'name email')
    .populate('created_by', 'name')
    .populate('departments_involved', 'name color')
    .populate('pm_employee_id', 'firstName lastName designation')
    .populate('account_manager_id', 'firstName lastName designation')
    .populate('team_members', 'firstName lastName designation')
    .lean();

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payments = await ClientPayment.find({ client_id: id })
    .populate('logged_by', 'name')
    .sort({ payment_date: -1 })
    .lean();

  const total_received = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return NextResponse.json({
    ...client,
    payments,
    total_received,
    outstanding_balance: (client.contract_value || 0) - total_received,
  });
});

// ─── PATCH — update client ────────────────────────────────────────────────────
export const PATCH = withPermission('clients.create', async (req, { params }) => {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const client = await Client.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await writeAudit({
    event_type: 'client.updated',
    entity_type: 'client',
    entity_id: id,
    actor_user_id: req.session?.user?.id,
    metadata: { fields: Object.keys(body) },
  });

  return NextResponse.json(client);
});

// ─── DELETE — admin only ──────────────────────────────────────────────────────
export const DELETE = withPermission('clients.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  await connectDB();
  const { id } = await params;

  await Promise.all([
    Client.findByIdAndDelete(id),
    ClientPayment.deleteMany({ client_id: new mongoose.Types.ObjectId(id) }),
  ]);

  await writeAudit({
    event_type: 'client.deleted',
    entity_type: 'client',
    entity_id: id,
    actor_user_id: session.user.id,
    metadata: {},
  });

  return NextResponse.json({ success: true });
});
