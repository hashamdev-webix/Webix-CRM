export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withAuth, hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Employee from '@/models/Employee';

// GET — single employee (financial fields only for admin/hr-financial)
export const GET = async (req, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await import('@/models/Department');
  await import('@/models/User');

  const canViewFinancial = hasPermission(session, 'hr.employees.financial');

  let query = Employee.findById(params.id)
    .populate('department', 'name code')
    .populate('reportingTo', 'firstName lastName employeeId designation')
    .populate('createdBy', 'name email');

  if (!canViewFinancial) {
    query = query.select('-bankName -accountNumber -accountTitle -salary -salaryType -allowances -deductions');
  }

  const employee = await query.lean();
  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ employee, canViewFinancial });
};

// PATCH — update employee
export const PATCH = async (req, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canEdit = hasPermission(session, 'hr.employees.edit');
  const canEditFinancial = hasPermission(session, 'hr.employees.financial');

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await req.json();

  // Strip financial fields if not authorized
  if (!canEditFinancial) {
    delete body.bankName;
    delete body.accountNumber;
    delete body.accountTitle;
    delete body.salary;
    delete body.salaryType;
    delete body.allowances;
    delete body.deductions;
  }

  // Strip status — use dedicated status route
  delete body.status;

  const employee = await Employee.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true, runValidators: true }
  ).populate('department', 'name code');

  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(employee);
};

// DELETE — soft delete
export const DELETE = async (req, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await Employee.findByIdAndUpdate(params.id, { isActive: false, status: 'inactive' });
  return NextResponse.json({ success: true });
};
