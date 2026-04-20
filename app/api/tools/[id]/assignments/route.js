import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ToolAssignment from '@/models/ToolAssignment';
import Tool from '@/models/Tool';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import '@/models/Employee';
import '@/models/Department';

export const GET = withPermission('hr.view', async (req, { params }) => {
  await connectDB();
  const assignments = await ToolAssignment.find({ tool_id: params.id })
    .populate('employee_id', 'firstName lastName email designation department employeeId')
    .populate('revoked_by', 'name')
    .populate('assigned_by', 'name')
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(assignments);
});

export const POST = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const body = await req.json();
  const { employee_id, access_type, access_given_date, notes } = body;
  if (!employee_id) return NextResponse.json({ error: 'employee_id required' }, { status: 400 });

  const existing = await ToolAssignment.findOne({ tool_id: params.id, employee_id, status: 'active' });
  if (existing) return NextResponse.json({ error: 'Already assigned' }, { status: 409 });

  const a = await ToolAssignment.create({
    tool_id: params.id,
    employee_id,
    access_type: access_type || '',
    access_given_date: access_given_date ? new Date(access_given_date) : new Date(),
    notes: notes || '',
    assigned_by: session.user.id,
    status: 'active',
  });

  const tool = await Tool.findById(params.id).select('name').lean();
  await writeAudit({ event_type: 'tool.access_granted', entity_type: 'tool', entity_id: params.id, actor_user_id: session.user.id, metadata: { tool_name: tool?.name, employee_id } });
  return NextResponse.json(a, { status: 201 });
});
