import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ClientPayment from '@/models/ClientPayment';
import Client from '@/models/Client';
import { withPermission } from '@/lib/permissions';

// ─── GET — list payments for a client ────────────────────────────────────────
export const GET = withPermission('clients.view', async (req, { params }) => {
  await connectDB();
  const { id } = await params;

  const payments = await ClientPayment.find({ client_id: id })
    .populate('logged_by', 'name')
    .sort({ payment_date: -1 })
    .lean();

  const total_received = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return NextResponse.json({ payments, total_received });
});

// ─── POST — log a new payment ─────────────────────────────────────────────────
export const POST = withPermission('clients.create', async (req, { params }, session) => {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const { payment_date, amount } = body;
  if (!payment_date || !amount) {
    return NextResponse.json({ error: 'payment_date and amount are required' }, { status: 400 });
  }

  const payment = await ClientPayment.create({
    client_id: id,
    payment_date,
    amount: Number(amount),
    currency: body.currency || 'PKR',
    method: body.method || '',
    invoice_number: body.invoice_number || '',
    notes: body.notes || '',
    logged_by: session.user.id,
  });

  return NextResponse.json(payment, { status: 201 });
});

// ─── DELETE — remove a payment ────────────────────────────────────────────────
export const DELETE = withPermission('clients.create', async (req, { params }, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  await connectDB();
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId');
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

  await ClientPayment.findByIdAndDelete(paymentId);
  return NextResponse.json({ success: true });
});
