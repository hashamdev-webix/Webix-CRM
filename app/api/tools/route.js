import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tool from '@/models/Tool';
import ToolAssignment from '@/models/ToolAssignment';
import { withPermission } from '@/lib/permissions';
import { encrypt } from '@/lib/encrypt';
import { writeAudit } from '@/lib/audit';
import '@/models/ToolCategory';
import '@/models/User';
import '@/models/Employee';

export const GET = withPermission('hr.view', async (req, _ctx, session) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const isAdmin = session.user.role === 'admin';

  const filter = { deleted_at: null };

  if (!isAdmin) {
    // Non-admins see only tools assigned to them
    const assignments = await ToolAssignment.find({ employee_id: session.user.id, status: 'active' }).select('tool_id').lean();
    const assignedIds = assignments.map((a) => a.tool_id);
    filter._id = { $in: assignedIds };
  }

  if (searchParams.get('status')) filter.status = searchParams.get('status');
  if (searchParams.get('category')) filter.category_id = searchParams.get('category');
  if (searchParams.get('search')) filter.name = { $regex: searchParams.get('search'), $options: 'i' };
  if (searchParams.get('expiring')) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    filter.expiry_date = { $lte: cutoff };
    filter.status = 'active';
  }

  const tools = await Tool.find(filter)
    .populate('category_id', 'name color is_smm_type')
    .populate('primary_owner', 'name email')
    .populate('created_by', 'name')
    .sort({ expiry_date: 1 })
    .lean();

  // Attach assigned user avatars
  const toolIds = tools.map((t) => t._id);
  const assignments = await ToolAssignment.find({ tool_id: { $in: toolIds }, status: 'active' })
    .populate('employee_id', 'firstName lastName email designation')
    .lean();
  const assignMap = {};
  assignments.forEach((a) => {
    const key = a.tool_id.toString();
    if (!assignMap[key]) assignMap[key] = [];
    if (a.employee_id) assignMap[key].push({
      ...a.employee_id,
      name: `${a.employee_id.firstName || ''} ${a.employee_id.lastName || ''}`.trim(),
    });
  });

  const enriched = tools.map((t) => {
    const today = new Date();
    const expiry = new Date(t.expiry_date);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    const monthlyEst = t.plan_duration_days > 0 ? (t.price / t.plan_duration_days) * 30 : 0;
    return { ...t, daysLeft, monthlyEst: Math.round(monthlyEst), assignees: assignMap[t._id.toString()] || [] };
  });

  return NextResponse.json(enriched);
});

export const POST = withPermission('hr.view', async (req, _ctx, session) => {
  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const body = await req.json();
  const { name, category_id, access_url, login_email, password, seller_name, purchase_date, price, billing_cycle, plan_name, plan_duration_days, primary_owner } = body;

  if (!name?.trim() || !category_id || !access_url?.trim() || !login_email?.trim() || !password?.trim() || !seller_name?.trim() || !purchase_date || !price || !billing_cycle || !plan_name?.trim() || !plan_duration_days || !primary_owner) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const purchaseD = new Date(purchase_date);
  const expiryD = new Date(purchaseD);
  expiryD.setDate(expiryD.getDate() + parseInt(plan_duration_days));

  const tool = await Tool.create({
    name: name.trim(),
    category_id,
    access_url: access_url.trim(),
    license_type: body.license_type || '',
    seats: body.seats || null,
    description: body.description || '',
    login_email: login_email.trim(),
    password_encrypted: encrypt(password),
    account_owner: body.account_owner || '',
    additional_login_notes: body.additional_login_notes || '',
    seller_name: seller_name.trim(),
    purchase_date: purchaseD,
    price: parseFloat(price),
    billing_cycle,
    plan_name: plan_name.trim(),
    plan_duration_days: parseInt(plan_duration_days),
    expiry_date: body.expiry_date ? new Date(body.expiry_date) : expiryD,
    auto_renewal: body.auto_renewal || false,
    primary_owner,
    status: body.status || 'active',
    visibility: body.visibility || 'company',
    is_smm_panel: body.is_smm_panel || false,
    smm_panel_type: body.smm_panel_type || '',
    smm_current_balance: body.smm_current_balance ?? null,
    smm_low_balance_threshold: body.smm_low_balance_threshold ?? null,
    company_id: session.user.company_id || null,
    created_by: session.user.id,
  });

  // Add initial assignments if provided
  if (Array.isArray(body.assigned_users) && body.assigned_users.length > 0) {
    await ToolAssignment.insertMany(
      body.assigned_users.map((emp) => ({
        tool_id: tool._id,
        employee_id: emp.employee_id,
        access_type: emp.access_type || '',
        access_given_date: emp.access_given_date || new Date(),
        notes: emp.notes || '',
        assigned_by: session.user.id,
        status: 'active',
      }))
    );
  }

  await writeAudit({ event_type: 'tool.created', entity_type: 'tool', entity_id: tool._id, actor_user_id: session.user.id, metadata: { name: tool.name } });
  return NextResponse.json(tool, { status: 201 });
});
