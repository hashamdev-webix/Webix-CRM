export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Employee from '@/models/Employee';
import EmployeeStatusLog from '@/models/EmployeeStatusLog';

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.status')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const { newStatus, reason } = await req.json();

  const VALID_STATUSES = ['active', 'on_leave', 'inactive', 'terminated', 'resigned'];
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const employee = await Employee.findById(params.id);
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const previousStatus = employee.status;

  await EmployeeStatusLog.create({
    employeeId: employee._id,
    previousStatus,
    newStatus,
    reason,
    changedBy: session.user.id,
  });

  employee.status = newStatus;
  await employee.save();

  return NextResponse.json({ success: true, status: newStatus });
}

// GET — status history
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await import('@/models/User');

  const logs = await EmployeeStatusLog.find({ employeeId: params.id })
    .populate('changedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(logs);
}
