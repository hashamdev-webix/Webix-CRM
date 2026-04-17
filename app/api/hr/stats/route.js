export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { withPermission } from '@/lib/permissions';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

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

  return NextResponse.json({
    summary: { totalActive, onLeave, totalInactive, totalDepts },
    statusBreakdown,
    deptBreakdown,
    typeBreakdown,
    recentHires,
  });
});
