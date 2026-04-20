import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tool from '@/models/Tool';
import ToolRenewalHistory from '@/models/ToolRenewalHistory';
import { withPermission } from '@/lib/permissions';
import { encrypt } from '@/lib/encrypt';
import { writeAudit } from '@/lib/audit';
import '@/models/ToolCategory';
import '@/models/User';

export const GET = withPermission('hr.view', async (req, { params }) => {
  await connectDB();
  const tool = await Tool.findOne({ _id: params.id, deleted_at: null })
    .populate('category_id', 'name color is_smm_type')
    .populate('primary_owner', 'name email')
    .populate('created_by', 'name')
    .lean();
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Never return the encrypted password in GET
  const { password_encrypted, ...safe } = tool;
  return NextResponse.json({ ...safe, has_password: !!password_encrypted });
});

export const PATCH = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const body = await req.json();
  const tool = await Tool.findOne({ _id: params.id, deleted_at: null });
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updateable = ['name', 'category_id', 'access_url', 'license_type', 'seats', 'description',
    'login_email', 'account_owner', 'additional_login_notes', 'seller_name', 'purchase_date',
    'price', 'billing_cycle', 'plan_name', 'plan_duration_days', 'expiry_date', 'auto_renewal',
    'primary_owner', 'status', 'visibility', 'is_smm_panel', 'smm_panel_type',
    'smm_current_balance', 'smm_low_balance_threshold'];

  updateable.forEach((k) => { if (body[k] !== undefined) tool[k] = body[k]; });

  if (body.password) tool.password_encrypted = encrypt(body.password);
  if (body.purchase_date && body.plan_duration_days && !body.expiry_date) {
    const d = new Date(body.purchase_date);
    d.setDate(d.getDate() + parseInt(body.plan_duration_days));
    tool.expiry_date = d;
  }

  await tool.save();
  await writeAudit({ event_type: 'tool.updated', entity_type: 'tool', entity_id: tool._id, actor_user_id: session.user.id, metadata: { name: tool.name } });
  const { password_encrypted, ...safe } = tool.toObject();
  return NextResponse.json({ ...safe, has_password: !!password_encrypted });
});

export const DELETE = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const tool = await Tool.findOne({ _id: params.id, deleted_at: null });
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tool.deleted_at = new Date();
  tool.status = 'cancelled';
  await tool.save();
  await writeAudit({ event_type: 'tool.deleted', entity_type: 'tool', entity_id: tool._id, actor_user_id: session.user.id, metadata: { name: tool.name } });
  return NextResponse.json({ success: true });
});
