'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, DollarSign, Users, UserMinus,
  UserPlus, Wrench, BarChart2, Target, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
  Briefcase, CreditCard, Activity, PieChart,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPKR(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `PKR ${(n / 1_000).toFixed(0)}K`;
  return `PKR ${Number(n).toLocaleString()}`;
}
function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}
function monthLabel(y, m) {
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

const STATUS_CONFIG = {
  active:           { label: 'Active',           color: 'bg-emerald-500' },
  on_hold:          { label: 'On Hold',          color: 'bg-orange-400' },
  under_review:     { label: 'Under Review',     color: 'bg-yellow-400' },
  trial:            { label: 'Trial',            color: 'bg-blue-400' },
  completed:        { label: 'Completed',         color: 'bg-teal-400' },
  churned:          { label: 'Churned',           color: 'bg-red-500' },
  potential_upsell: { label: 'Upsell',           color: 'bg-purple-400' },
};

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function Trend({ value, inverse = false }) {
  if (value == null) return null;
  const positive = inverse ? value < 0 : value > 0;
  const neutral  = value === 0;
  if (neutral) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, trendInverse, icon: Icon, iconBg, iconColor, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${accent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trend != null && <Trend value={trend} inverse={trendInverse} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</span>
      <span className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Mini Bar Chart (inline SVG) ─────────────────────────────────────────────
function MiniBarChart({ data, valueKey, labelKey, color = '#ef4444' }) {
  if (!data?.length) return <p className="text-xs text-gray-300 py-4 text-center">No data</p>;
  const max = Math.max(...data.map(d => d[valueKey] || 0)) || 1;
  return (
    <div className="flex items-end gap-1 h-16 mt-2">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round(((d[valueKey] || 0) / max) * 100));
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-0.5 group">
            <div className="relative w-full flex items-end justify-center h-12">
              <div
                className="w-full rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                style={{ height: `${pct}%`, backgroundColor: color, minHeight: 3 }}
              />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                {fmtPKR(d[valueKey])}
              </div>
            </div>
            <p className="text-[8px] text-gray-400 truncate w-full text-center">{d[labelKey]}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ segments }) {
  if (!segments?.length) return null;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  if (total === 0) return null;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  let cumulative = 0;
  const R = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * R;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      {segments.map((seg, i) => {
        const fraction = (seg.value || 0) / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const offset = circumference - cumulative * circumference;
        cumulative += fraction;
        return (
          <circle key={i} cx={cx} cy={cy} r={R}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}

// ─── Cost Breakdown ───────────────────────────────────────────────────────────
function CostBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{fmtPKR(value)} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/business-dashboard');
      setData(res.data);
    } catch {
      toast({ title: 'Failed to load business dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Business Dashboard" subtitle="CEO Command Center" />
      <div className="flex-1 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  const { kpis, charts, recentClients, month } = data || {};
  const periodLabel = month ? monthLabel(month.year, month.month) : '';

  const isProfit = (kpis?.netProfit || 0) >= 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Business Dashboard"
        subtitle={`CEO Command Center · ${periodLabel}`}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live data · refreshes on load</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── PROFIT HERO ── */}
        <div className={`rounded-2xl p-6 mb-5 border flex flex-col md:flex-row md:items-center gap-4 ${isProfit ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${isProfit ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}>
            {isProfit ? <TrendingUp className="h-7 w-7 text-white" /> : <TrendingDown className="h-7 w-7 text-white" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Profit — {periodLabel}</p>
            <p className={`text-4xl font-black mt-1 ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmtPKR(kpis?.netProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Revenue {fmtPKR(kpis?.revenueThisMonth)} &nbsp;−&nbsp; Costs {fmtPKR(kpis?.totalCosts)}
              {kpis?.profitMargin != null && (
                <span className={`ml-2 font-semibold ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                  ({kpis.profitMargin}% margin)
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
            {[
              { label: 'Revenue', value: fmtPKR(kpis?.revenueThisMonth), color: 'text-emerald-700' },
              { label: 'Salaries', value: fmtPKR(kpis?.totalSalaries), color: 'text-gray-700' },
              { label: 'Ad Spend', value: fmtPKR(kpis?.adSpendThisMonth), color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── REVENUE & CLIENTS ── */}
        <SectionLabel>Revenue & Clients</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Revenue This Month"
            value={fmtPKR(kpis?.revenueThisMonth)}
            sub={`vs ${fmtPKR(kpis?.revenueLastMonth)} last month`}
            trend={kpis?.revenueGrowth}
            icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600"
            onClick={() => router.push('/clients')}
          />
          <KpiCard
            label="Monthly Retainer (Active)"
            value={fmtPKR(kpis?.monthlyRetainerTotal)}
            sub="Sum of active client retainers"
            icon={CreditCard} iconBg="bg-blue-50" iconColor="text-blue-600"
          />
          <KpiCard
            label="Outstanding Payments"
            value={fmtPKR(kpis?.totalOutstanding)}
            sub="Total unpaid across all clients"
            icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-600"
            trendInverse
            onClick={() => router.push('/clients')}
          />
          <KpiCard
            label="Active Clients"
            value={fmtNum(kpis?.activeClientsCount)}
            sub={`+${kpis?.newClientsThisMonth ?? 0} new · ${kpis?.churnedThisMonth ?? 0} churned this month`}
            icon={Briefcase} iconBg="bg-red-50" iconColor="text-red-600"
            accent
            onClick={() => router.push('/clients')}
          />
        </div>

        {/* ── PEOPLE & COSTS ── */}
        <SectionLabel>People & Costs</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Team Salary Cost"
            value={fmtPKR(kpis?.totalSalaries)}
            sub={`${kpis?.activeEmployeeCount ?? 0} active employees`}
            icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600"
            onClick={() => router.push('/hr/payroll')}
          />
          <KpiCard
            label="Tools & Software"
            value={fmtPKR(kpis?.totalToolsCost)}
            sub={`${kpis?.activeToolsCount ?? 0} active subscriptions`}
            icon={Wrench} iconBg="bg-gray-100" iconColor="text-gray-600"
            onClick={() => router.push('/hr/tools')}
          />
          <KpiCard
            label="Ad Spend This Month"
            value={fmtPKR(kpis?.adSpendThisMonth)}
            sub={`vs ${fmtPKR(kpis?.adSpendLastMonth)} last month`}
            trend={kpis?.adSpendGrowth}
            trendInverse
            icon={BarChart2} iconBg="bg-yellow-50" iconColor="text-yellow-600"
            onClick={() => router.push('/ad-performance')}
          />
          <KpiCard
            label="Total Costs"
            value={fmtPKR(kpis?.totalCosts)}
            sub="Salaries + Tools + Ads"
            icon={Activity} iconBg="bg-rose-50" iconColor="text-rose-600"
          />
        </div>

        {/* ── PIPELINE ── */}
        <SectionLabel>Growth Pipeline</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard
            label="New Clients This Month"
            value={fmtNum(kpis?.newClientsThisMonth)}
            sub="Conversion date in current month"
            icon={UserPlus} iconBg="bg-teal-50" iconColor="text-teal-600"
            onClick={() => router.push('/clients')}
          />
          <KpiCard
            label="Churned This Month"
            value={fmtNum(kpis?.churnedThisMonth)}
            sub="Status changed to Churned"
            icon={UserMinus} iconBg="bg-red-50" iconColor="text-red-500"
            trendInverse
            onClick={() => router.push('/clients')}
          />
          <KpiCard
            label="Lead Conversion Rate"
            value={kpis?.leadConversionRate != null ? `${kpis.leadConversionRate}%` : '—'}
            sub={`From ${fmtNum(kpis?.totalLeadsThisMonth)} leads this month`}
            icon={Target} iconBg="bg-indigo-50" iconColor="text-indigo-600"
            onClick={() => router.push('/leads')}
          />
          <KpiCard
            label="Ad Conversions"
            value={fmtNum(kpis?.totalAdConversions)}
            sub="From Meta + Google this month"
            icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600"
            onClick={() => router.push('/ad-performance')}
          />
        </div>

        {/* ── CHARTS ROW ── */}
        <SectionLabel>Analytics</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Trend — 6 months */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">Revenue Trend</p>
              <span className="text-[10px] text-gray-400">Last 6 months</span>
            </div>
            <p className="text-xs text-gray-400">Monthly payment collections (PKR)</p>
            <MiniBarChart
              data={charts?.revenueTrend || []}
              valueKey="revenue"
              labelKey="label"
              color="#ef4444"
            />
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">Cost Breakdown</p>
            <p className="text-xs text-gray-400 mb-4">This month — {fmtPKR(kpis?.totalCosts)} total</p>
            <div className="space-y-3">
              <CostBar label="Team Salaries" value={kpis?.totalSalaries || 0} total={kpis?.totalCosts || 1} color="bg-purple-400" />
              <CostBar label="Ad Spend"      value={kpis?.adSpendThisMonth || 0} total={kpis?.totalCosts || 1} color="bg-yellow-400" />
              <CostBar label="Tools & Software" value={kpis?.totalToolsCost || 0} total={kpis?.totalCosts || 1} color="bg-gray-400" />
            </div>
            {kpis?.totalCosts === 0 && <p className="text-xs text-gray-300 text-center mt-4">No cost data yet</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">

          {/* Client Status Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Client Status Breakdown</p>
            {(charts?.clientStatusBreakdown?.length > 0) ? (
              <div className="flex items-center gap-4">
                <DonutChart segments={(charts.clientStatusBreakdown || []).map(s => ({
                  label: STATUS_CONFIG[s.status]?.label || s.status,
                  value: s.count,
                }))} />
                <div className="flex-1 space-y-1.5">
                  {charts.clientStatusBreakdown.map((s, i) => {
                    const cfg = STATUS_CONFIG[s.status] || { label: s.status, color: 'bg-gray-400' };
                    const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];
                    return (
                      <div key={s.status} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600 flex-1">{cfg.label}</span>
                        <span className="font-semibold text-gray-800">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-300 text-center py-6">No client data yet</p>
            )}
          </div>

          {/* Ad Spend by Platform */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">Ad Spend by Platform</p>
            <p className="text-xs text-gray-400 mb-3">Current month</p>
            {(charts?.adSpendByPlatform?.length > 0) ? (
              <div className="space-y-2.5">
                {charts.adSpendByPlatform.map(p => {
                  const total = charts.adSpendByPlatform.reduce((s, x) => s + x.spend, 0);
                  const pct = total > 0 ? Math.round((p.spend / total) * 100) : 0;
                  const color = p.platform === 'meta' ? 'bg-blue-500' : p.platform === 'google' ? 'bg-yellow-500' : 'bg-gray-400';
                  return (
                    <div key={p.platform} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-gray-600">{p.platform}</span>
                        <span className="font-medium text-gray-800">{fmtPKR(p.spend)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400">
                        {fmtNum(p.clicks)} clicks · {fmtNum(p.impressions)} impressions · {fmtNum(p.conversions)} conv.
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-300 text-center py-6">No ad data this month</p>
            )}
          </div>

          {/* Recent Clients */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Recent Clients</p>
              <button onClick={() => router.push('/clients')}
                className="text-xs text-red-600 hover:underline flex items-center gap-0.5">
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {(recentClients || []).length === 0 && (
                <p className="text-xs text-gray-300 text-center py-4">No clients yet</p>
              )}
              {(recentClients || []).map(c => {
                const cfg = STATUS_CONFIG[c.status] || { label: c.status, color: 'bg-gray-400' };
                return (
                  <div key={c._id}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${c._id}`)}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {c.brand_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.brand_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{(c.services || []).slice(0, 2).join(' · ')}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
