export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Employee from '@/models/Employee';
import SalaryHistory from '@/models/SalaryHistory';

// GET — salary history
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.financial')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await import('@/models/User');
  const history = await SalaryHistory.find({ employeeId: params.id })
    .populate('changedBy', 'name')
    .sort({ effectiveDate: -1 })
    .lean();
  return NextResponse.json(history);
}

// POST — record salary revision
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.financial')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const { newSalary, effectiveDate, reason, allowances, deductions } = await req.json();

  const employee = await Employee.findById(params.id);
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await SalaryHistory.create({
    employeeId: employee._id,
    previousSalary: employee.salary,
    newSalary,
    effectiveDate,
    reason,
    changedBy: session.user.id,
  });

  const updates = { salary: newSalary };
  if (allowances !== undefined) updates.allowances = allowances;
  if (deductions !== undefined) updates.deductions = deductions;
  await Employee.findByIdAndUpdate(params.id, { $set: updates });

  return NextResponse.json({ success: true });
}
