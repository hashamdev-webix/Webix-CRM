import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SmmTopup from '@/models/SmmTopup';
import Tool from '@/models/Tool';
import { withPermission } from '@/lib/permissions';
import '@/models/User';

export const GET = withPermission('hr.view', async (req, { params }) => {
  await connectDB();
  const topups = await SmmTopup.find({ tool_id: params.id })
    .populate('added_by', 'name')
    .sort({ topup_date: -1 })
    .lean();
  return NextResponse.json(topups);
});

export const POST = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const { topup_date, amount, payment_method, notes } = await req.json();
  if (!topup_date || !amount) return NextResponse.json({ error: 'topup_date and amount required' }, { status: 400 });

  const topup = await SmmTopup.create({ tool_id: params.id, topup_date: new Date(topup_date), amount: parseFloat(amount), payment_method: payment_method || '', added_by: session.user.id, notes: notes || '' });

  // Update current balance on the tool
  const tool = await Tool.findById(params.id);
  if (tool) {
    tool.smm_current_balance = (tool.smm_current_balance || 0) + parseFloat(amount);
    await tool.save();
  }

  return NextResponse.json(topup, { status: 201 });
});
