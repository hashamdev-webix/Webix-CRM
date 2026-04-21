export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withPermission } from '@/lib/permissions';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import PayrollRecord from '@/models/PayrollRecord';

export const GET = withPermission('hr.view', async () => {
  await connectDB();
  await import('@/models/Department');

  const [
    totalActive,
    onLeave,
    totalInactive,
    statusBreakdown,
    deptBreakdown,
    typeBreakdown,
    recentHires,
    totalDepts,
  ] = await Promise.all([
    Employee.countDocuments({ isActive: true, status: 'active' }),
    Employee.countDocuments({ isActive: true, status: 'on_leave' }),
    Employee.countDocuments({ isActive: true, status: { $in: ['inactive', 'terminated', 'resigned'] } }),
    Employee.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Employee.aggregate([
      { $match: { isActive: true, department: { $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments', localField: '_id', foreignField: '_id', as: 'dept',
        },
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$dept.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Employee.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } },
    ]),
    Employee.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('department', 'name')
      .select('firstName lastName employeeId designation department joinDate profilePhoto')
      .lean(),
    Department.countDocuments({ isActive: true }),
  ]);

  // ── Latest payroll month summary ──────────────────────────────────────────
  // Find the most recent month/year that has records
  const latestPeriod = await PayrollRecord.findOne({})
    .sort({ year: -1, month: -1 })
    .select('month year')
    .lean();

  let payrollSummary = null;
  if (latestPeriod) {
    const { month, year } = latestPeriod;
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const [agg, deptAgg] = await Promise.all([
      PayrollRecord.aggregate([
        { $match: { month, year } },
        {
          $group: {
            _id: null,
            totalNet:       { $sum: '$netSalary' },
            totalEarnings:  { $sum: { $add: ['$basicSalary', '$allowances'] } },
            totalDeductions:{ $sum: { $add: ['$deductions', { $multiply: [{ $cond: [{ $gt: ['$absentDays', 0] }, '$absentDays', 0] }, { $cond: [{ $gt: ['$workingDays', 0] }, { $divide: ['$basicSalary', '$workingDays'] }, 0] }] }] } },
            employeeCount:  { $sum: 1 },
            draftCount:     { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            finalizedCount: { $sum: { $cond: [{ $eq: ['$status', 'finalized'] }, 1, 0] } },
          },
        },
      ]),
      // Per-department breakdown
      PayrollRecord.aggregate([
        { $match: { month, year } },
        {
          $lookup: {
            from: 'employees',
            localField: 'employee_id',
            foreignField: '_id',
            as: 'emp',
          },
        },
        { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'departments',
            localField: 'emp.department',
            foreignField: '_id',
            as: 'dept',
          },
        },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { deptId: '$dept._id', deptName: '$dept.name' },
            totalNet: { $sum: '$netSalary' },
            count:    { $sum: 1 },
          },
        },
        { $sort: { totalNet: -1 } },
        { $limit: 6 },
        { $project: { deptName: '$_id.deptName', totalNet: 1, count: 1, _id: 0 } },
      ]),
    ]);

    const totals = agg[0] || {};
    payrollSummary = {
      month,
      year,
      monthName: MONTHS[month - 1],
      totalNet:        Math.round(totals.totalNet       || 0),
      totalEarnings:   Math.round(totals.totalEarnings  || 0),
      totalDeductions: Math.round(totals.totalDeductions|| 0),
      employeeCount:   totals.employeeCount  || 0,
      draftCount:      totals.draftCount     || 0,
      finalizedCount:  totals.finalizedCount || 0,
      deptBreakdown:   deptAgg,
    };
  }

  return NextResponse.json({
    summary: { totalActive, onLeave, totalInactive, totalDepts },
    statusBreakdown,
    deptBreakdown,
    typeBreakdown,
    recentHires,
    payrollSummary,
  });
});
