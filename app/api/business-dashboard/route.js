export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ClientPayment from '@/models/ClientPayment';
import Employee from '@/models/Employee';
import PayrollRecord from '@/models/PayrollRecord';
import Tool from '@/models/Tool';
import AdMetric from '@/models/AdMetric';
import Lead from '@/models/Lead';
import DataEntryLead from '@/models/DataEntryLead';
import SocialLead from '@/models/SocialLead';
import { withAdmin } from '@/lib/permissions';

// Monthly-normalize a tool's cost based on billing cycle
function monthlyToolCost(price, billingCycle) {
  switch (billingCycle) {
    case 'Monthly':    return price;
    case 'Quarterly':  return price / 3;
    case '6-Monthly':  return price / 6;
    case 'Annual':     return price / 12;
    default:           return 0; // Lifetime / One-time — already paid
  }
}

export const GET = withAdmin(async () => {
  await connectDB();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = monthStart;

  // ── 1. CLIENT STATS ─────────────────────────────────────────────────────────
  const [
    activeClientsCount,
    newClientsThisMonth,
    churnedThisMonth,
    allActiveClients,
  ] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Client.countDocuments({ conversion_date: { $gte: monthStart, $lt: monthEnd } }),
    Client.countDocuments({ status: 'churned', updatedAt: { $gte: monthStart, $lt: monthEnd } }),
    Client.find({ status: 'active' }, 'contract_value monthly_retainer currency').lean(),
  ]);

  // ── 2. REVENUE THIS MONTH ────────────────────────────────────────────────────
  // Payments logged this month (PKR only for simplicity; sum all currencies)
  const paymentAgg = await ClientPayment.aggregate([
    { $match: { payment_date: { $gte: monthStart, $lt: monthEnd } } },
    { $group: { _id: '$currency', total: { $sum: '$amount' } } },
  ]);
  const revenueThisMonthByCurrency = Object.fromEntries(
    paymentAgg.map(p => [p._id, p.total])
  );
  const revenueThisMonth = paymentAgg.reduce((s, p) => s + p.total, 0);

  // Monthly retainer sum from active clients
  const monthlyRetainerTotal = allActiveClients.reduce((s, c) => s + (c.monthly_retainer || 0), 0);

  // Last month revenue for trend
  const lastMonthPayAgg = await ClientPayment.aggregate([
    { $match: { payment_date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const revenueLastMonth = lastMonthPayAgg[0]?.total || 0;

  // ── 3. OUTSTANDING PAYMENTS ──────────────────────────────────────────────────
  const allClients = await Client.find({}, 'contract_value currency _id').lean();
  const allPaymentTotals = await ClientPayment.aggregate([
    { $group: { _id: '$client_id', total: { $sum: '$amount' } } },
  ]);
  const payMap = Object.fromEntries(allPaymentTotals.map(p => [p._id.toString(), p.total]));
  const totalOutstanding = allClients.reduce((s, c) => {
    const received = payMap[c._id.toString()] || 0;
    const balance = (c.contract_value || 0) - received;
    return s + Math.max(0, balance);
  }, 0);

  // ── 4. PAYROLL / SALARY COSTS ────────────────────────────────────────────────
  // Try finalized payroll for this month first
  const payrollAgg = await PayrollRecord.aggregate([
    { $match: { month: now.getMonth() + 1, year: now.getFullYear(), status: 'finalized' } },
    { $group: { _id: null, total: { $sum: '$netSalary' } } },
  ]);
  let totalSalaries = payrollAgg[0]?.total || 0;

  // Fall back to live employee salaries if no finalized payroll yet
  if (totalSalaries === 0) {
    const salaryAgg = await Employee.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: { $add: ['$salary', '$allowances'] } } } },
    ]);
    totalSalaries = salaryAgg[0]?.total || 0;
  }

  const activeEmployeeCount = await Employee.countDocuments({ status: 'active' });

  // ── 5. TOOLS COST ─────────────────────────────────────────────────────────────
  const activeTools = await Tool.find(
    { status: 'active', deleted_at: null },
    'price billing_cycle name'
  ).lean();
  const totalToolsCost = activeTools.reduce(
    (s, t) => s + monthlyToolCost(t.price, t.billing_cycle), 0
  );

  // ── 6. AD SPEND THIS MONTH ───────────────────────────────────────────────────
  const adSpendAgg = await AdMetric.aggregate([
    { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
    { $group: { _id: '$platform', spend: { $sum: '$spend' }, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' }, conversions: { $sum: '$conversions' } } },
  ]);
  const adSpendThisMonth = adSpendAgg.reduce((s, p) => s + p.spend, 0);
  const adSpendByPlatform = adSpendAgg.map(p => ({
    platform: p._id,
    spend: p.spend,
    impressions: p.impressions,
    clicks: p.clicks,
    conversions: p.conversions,
  }));
  const totalAdConversions = adSpendAgg.reduce((s, p) => s + (p.conversions || 0), 0);

  // Last month ad spend for trend
  const lastMonthAdAgg = await AdMetric.aggregate([
    { $match: { date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
    { $group: { _id: null, spend: { $sum: '$spend' } } },
  ]);
  const adSpendLastMonth = lastMonthAdAgg[0]?.spend || 0;

  // ── 7. LEAD CONVERSION RATE ──────────────────────────────────────────────────
  const [legacyLeadsThisMonth, dataEntryLeadsThisMonth, socialLeadsThisMonth] = await Promise.all([
    Lead.countDocuments({ receivedAt: { $gte: monthStart, $lt: monthEnd } }),
    DataEntryLead.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
    SocialLead.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
  ]);
  const totalLeadsThisMonth = legacyLeadsThisMonth + dataEntryLeadsThisMonth + socialLeadsThisMonth;
  const leadConversionRate = totalLeadsThisMonth > 0
    ? Math.round((newClientsThisMonth / totalLeadsThisMonth) * 100 * 10) / 10
    : 0;

  // ── 8. NET PROFIT ─────────────────────────────────────────────────────────────
  const totalCosts = totalSalaries + totalToolsCost + adSpendThisMonth;
  const netProfit  = revenueThisMonth - totalCosts;

  // ── 9. REVENUE TREND (last 6 months) ─────────────────────────────────────────
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const revenueTrend = await ClientPayment.aggregate([
    { $match: { payment_date: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$payment_date' }, month: { $month: '$payment_date' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // ── 10. CLIENT STATUS BREAKDOWN ───────────────────────────────────────────────
  const clientStatusBreakdown = await Client.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // ── 11. RECENT CLIENTS ────────────────────────────────────────────────────────
  const recentClients = await Client.find({}, 'brand_name status services conversion_date contract_value currency monthly_retainer')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return NextResponse.json({
    month: { year: now.getFullYear(), month: now.getMonth() + 1 },

    // KPI cards
    kpis: {
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth: revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10
        : null,

      monthlyRetainerTotal,

      activeClientsCount,
      newClientsThisMonth,
      churnedThisMonth,

      totalSalaries,
      activeEmployeeCount,

      totalToolsCost,
      activeToolsCount: activeTools.length,

      adSpendThisMonth,
      adSpendLastMonth,
      adSpendGrowth: adSpendLastMonth > 0
        ? Math.round(((adSpendThisMonth - adSpendLastMonth) / adSpendLastMonth) * 100 * 10) / 10
        : null,
      totalAdConversions,

      totalCosts,
      netProfit,
      profitMargin: revenueThisMonth > 0
        ? Math.round((netProfit / revenueThisMonth) * 100 * 10) / 10
        : null,

      totalOutstanding,
      leadConversionRate,
      totalLeadsThisMonth,
    },

    // Charts
    charts: {
      revenueTrend: revenueTrend.map(r => ({
        label: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        revenue: r.revenue,
        count: r.count,
      })),
      adSpendByPlatform,
      clientStatusBreakdown: clientStatusBreakdown.map(s => ({
        status: s._id,
        count: s.count,
      })),
      costBreakdown: [
        { label: 'Salaries', value: totalSalaries },
        { label: 'Ad Spend', value: adSpendThisMonth },
        { label: 'Tools', value: totalToolsCost },
      ],
    },

    recentClients,
  });
});
