import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tool from '@/models/Tool';
import ToolRenewalHistory from '@/models/ToolRenewalHistory';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const GET = withPermission('hr.view', async (req, { params }) => {
  await connectDB();
  const history = await ToolRenewalHistory.find({ tool_id: params.id })
    .populate('renewed_by', 'name')
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json(history);
});

export const POST = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const { purchase_date, amount_paid, plan_duration_days } = await req.json();
  if (!purchase_date || !amount_paid || !plan_duration_days) {
    return NextResponse.json({ error: 'purchase_date, amount_paid, plan_duration_days required' }, { status: 400 });
  }

  const tool = await Tool.findOne({ _id: params.id, deleted_at: null });
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const purchaseD = new Date(purchase_date);
  const expiryD = new Date(purchaseD);
  expiryD.setDate(expiryD.getDate() + parseInt(plan_duration_days));

  const count = await ToolRenewalHistory.countDocuments({ tool_id: params.id });
  const renewal = await ToolRenewalHistory.create({
    tool_id: tool._id,
    renewal_number: count + 1,
    purchase_date: purchaseD,
    expiry_date: expiryD,
    amount_paid: parseFloat(amount_paid),
    plan_duration_days: parseInt(plan_duration_days),
    renewed_by: session.user.id,
  });

  tool.purchase_date = purchaseD;
  tool.expiry_date = expiryD;
  tool.price = parseFloat(amount_paid);
  tool.plan_duration_days = parseInt(plan_duration_days);
  tool.status = 'active';
  await tool.save();

  await writeAudit({ event_type: 'tool.renewed', entity_type: 'tool', entity_id: tool._id, actor_user_id: session.user.id, metadata: { name: tool.name, new_expiry: expiryD } });
  return NextResponse.json(renewal, { status: 201 });
});
