import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { withPermission } from '@/lib/permissions';
import '@/models/ToolCategory';

export const GET = withPermission('hr.view', async (req, _ctx, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();

  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);

  const tools = await Tool.find({ deleted_at: null, status: { $ne: 'cancelled' } })
    .populate('category_id', 'name color')
    .lean();

  let monthlySpend = 0, annualSpend = 0, expiringCount = 0;
  const catMap = {}, statusMap = {};

  tools.forEach((t) => {
    const daily = t.plan_duration_days > 0 ? t.price / t.plan_duration_days : 0;
    const monthly = Math.round(daily * 30);
    const annual = Math.round(daily * 365);
    if (t.status === 'active') { monthlySpend += monthly; annualSpend += annual; }
    if (t.status === 'active' && t.expiry_date && new Date(t.expiry_date) <= in30) expiringCount++;
    const catName = t.category_id?.name || 'Uncategorized';
    const catColor = t.category_id?.color || '#9ca3af';
    if (!catMap[catName]) catMap[catName] = { name: catName, color: catColor, totalCost: 0, count: 0 };
    catMap[catName].totalCost += monthly;
    catMap[catName].count++;
    statusMap[t.status] = (statusMap[t.status] || 0) + 1;
  });

  const topExpensive = [...tools]
    .filter((t) => t.status === 'active')
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map((t) => ({ name: t.name, price: t.price, billing_cycle: t.billing_cycle }));

  return NextResponse.json({
    totalActive: tools.filter((t) => t.status === 'active').length,
    monthlySpend: Math.round(monthlySpend),
    annualSpend: Math.round(annualSpend),
    expiringThisMonth: expiringCount,
    categoryBreakdown: Object.values(catMap).sort((a, b) => b.totalCost - a.totalCost),
    statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    topExpensive,
  });
});
