export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withPermission, hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

// GET — list employees with filters
export const GET = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Allow: admin, hr.employees.view, hr.view (own profile only handled by [id] route)
  const canViewAll = hasPermission(session, 'hr.employees.view');
  const canView = hasPermission(session, 'hr.view');
  if (!canViewAll && !canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  await import('@/models/Department');

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || '';
  const status = searchParams.get('status') || '';
  const employmentType = searchParams.get('employmentType') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const filter = { isActive: true };
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (employmentType) filter.employmentType = employmentType;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('department', 'name code')
      .populate('reportingTo', 'firstName lastName employeeId')
      .select('-bankName -accountNumber -accountTitle -salary -salaryType -allowances -deductions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  return NextResponse.json({ employees, total, page, limit });
};

// POST — create employee
export const POST = withPermission('hr.employees.create', async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();
  body.createdBy = session.user.id;
  const employee = await Employee.create(body);
  return NextResponse.json(employee, { status: 201 });
});
