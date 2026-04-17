export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import EmployeeExit from '@/models/EmployeeExit';
import Employee from '@/models/Employee';
import EmployeeStatusLog from '@/models/EmployeeStatusLog';

// GET — get exit record
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.exit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await import('@/models/User');
  const exit = await EmployeeExit.findOne({ employeeId: params.id })
    .populate('initiatedBy', 'name')
    .populate('createdBy', 'name')
    .lean();
  return NextResponse.json(exit || null);
}

// POST — initiate exit
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.exit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const body = await req.json();
  const existing = await EmployeeExit.findOne({ employeeId: params.id });
  if (existing) return NextResponse.json({ error: 'Exit record already exists' }, { status: 400 });

  const exit = await EmployeeExit.create({
    ...body,
    employeeId: params.id,
    initiatedBy: session.user.id,
    createdBy: session.user.id,
  });

  // Update employee status based on exit type
  const statusMap = {
    resignation: 'resigned',
    termination: 'terminated',
    retirement: 'inactive',
    contract_end: 'inactive',
  };
  const newStatus = statusMap[body.exitType] || 'inactive';
  const employee = await Employee.findById(params.id);
  if (employee) {
    await EmployeeStatusLog.create({
      employeeId: params.id,
      previousStatus: employee.status,
      newStatus,
      reason: `Exit initiated: ${body.exitType}`,
      changedBy: session.user.id,
    });
    employee.status = newStatus;
    await employee.save();
  }

  return NextResponse.json(exit, { status: 201 });
}

// PATCH — update exit record (clearance etc.)
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.exit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const body = await req.json();
  const exit = await EmployeeExit.findOneAndUpdate(
    { employeeId: params.id },
    { $set: body },
    { new: true }
  );
  if (!exit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(exit);
}
