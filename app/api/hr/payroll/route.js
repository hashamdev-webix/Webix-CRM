import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PayrollRecord from '@/models/PayrollRecord';
import Employee from '@/models/Employee';
import { withPermission } from '@/lib/permissions';

// GET /api/hr/payroll?month=&year=
export const GET = withPermission('hr.view', async (req) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year  = Number(searchParams.get('year'));

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year required' }, { status: 400 });
  }

  const records = await PayrollRecord.find({ month, year })
    .populate('employee_id', 'firstName lastName employeeId designation department salary allowances deductions joinDate bankName accountNumber')
    .lean();

  return NextResponse.json(records);
});

// POST /api/hr/payroll — batch upsert
export const POST = withPermission('hr.view', async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();
  const { month, year, records, finalize } = body;

  if (!month || !year || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'month, year, records[] required' }, { status: 400 });
  }

  const ops = records.map(r => ({
    updateOne: {
      filter: { employee_id: r.employee_id, month, year },
      update: {
        $set: {
          basicSalary: r.basicSalary || 0,
          allowances:  r.allowances  || 0,
          deductions:  r.deductions  || 0,
          workingDays: r.workingDays || 26,
          presentDays: r.presentDays || 0,
          leaves:      r.leaves      || 0,
          absentDays:  r.absentDays  || 0,
          netSalary:   r.netSalary   || 0,
          status:      finalize ? 'finalized' : 'draft',
          updated_by:  session.user.id,
          ...(finalize ? { finalized_at: new Date() } : {}),
        },
        $setOnInsert: {
          created_by: session.user.id,
        },
      },
      upsert: true,
    },
  }));

  await PayrollRecord.bulkWrite(ops);

  return NextResponse.json({ ok: true, saved: records.length });
});
