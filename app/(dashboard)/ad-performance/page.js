'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format, startOfMonth } from 'date-fns';
import {
  Eye, MousePointer, DollarSign, TrendingUp, Target, BarChart2,
  RefreshCw, Percent, Zap, PieChart,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import MetricOverTimeChart from '@/components/charts/MetricOverTimeChart';

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
];

// ─── Metric definitions ───────────────────────────────────────────────────────
function getMetrics(summary) {
  return [
    {
      key: 'spend',
      title: 'Total Spend',
      value: formatCurrency(summary?.spend),
      icon: DollarSign,
      color: 'bg-black text-white',
      chartColor: '#ef4444',
      formatter: (v) => `$${parseFloat(v).toFixed(2)}`,
    },
    {
      key: 'impressions',
      title: 'Impressions',
      value: formatNumber(summary?.impressions),
      icon: Eye,
      color: 'bg-red-50 text-red-600',
      chartColor: '#6366f1',
      formatter: (v) => formatNumber(v),
    },
    {
      key: 'clicks',
      title: 'Clicks',
      value: formatNumber(summary?.clicks),
      icon: MousePointer,
      color: 'bg-red-100 text-red-700',
      chartColor: '#3b82f6',
      formatter: (v) => formatNumber(v),
    },
    {
      key: 'ctr',
      title: 'CTR',
      value: summary?.ctr != null ? `${(summary.ctr * 100).toFixed(2)}%` : '—',
      icon: Percent,
      color: 'bg-zinc-100 text-zinc-700',
      chartColor: '#8b5cf6',
      formatter: (v) => `${parseFloat(v).toFixed(2)}%`,
    },
    {
      key: 'cpc',
      title: 'CPC',
      value: formatCurrency(summary?.cpc),
      icon: Target,
      color: 'bg-orange-50 text-orange-600',
      chartColor: '#f59e0b',
      formatter: (v) => `$${parseFloat(v).toFixed(2)}`,
    },
    {
      key: 'conversions',
      title: 'Conversions',
      value: formatNumber(summary?.conversions),
      icon: BarChart2,
      color: 'bg-zinc-200 text-zinc-800',
      chartColor: '#10b981',
      formatter: (v) => formatNumber(v),
    },
    {
      key: 'cpl',
      title: 'Cost / Lead',
      value: formatCurrency(summary?.costPerLead),
      icon: DollarSign,
      color: 'bg-red-600 text-white',
      chartColor: '#ef4444',
      formatter: (v) => `$${parseFloat(v).toFixed(2)}`,
    },
    {
      key: 'roas',
      title: 'ROAS',
      value: summary?.roas != null ? `${parseFloat(summary.roas).toFixed(2)}x` : '—',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
      chartColor: '#059669',
      formatter: (v) => `${parseFloat(v).toFixed(2)}x`,
      hint: 'Leads per $1,000 ad spend',
    },
    {
      key: 'roi',
      title: 'ROI',
      value: summary?.roi != null ? `${parseFloat(summary.roi).toFixed(1)}%` : '—',
      icon: PieChart,
      color: 'bg-sky-50 text-sky-600',
      chartColor: '#0ea5e9',
      formatter: (v) => `${parseFloat(v).toFixed(1)}%`,
      hint: 'Estimated — assumes $1,000 avg lead value',
    },
  ];
}

export default function AdPerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeMetric, setActiveMetric] = useState('spend');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (platform) params.set('platform', platform);
      const res = await axios.get(`/api/ad-metrics?${params}`);
      setData(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, platform]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { summary, perCampaign, metricsOverTime } = data || {};
  const metrics = getMetrics(summary);
  const active = metrics.find((m) => m.key === activeMetric) || metrics[0];

  return (
    <>
      <Header title="Ad Performance" subtitle="Metrics from Meta and Google Ads" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" className="h-9 w-full sm:w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" className="h-9 w-full sm:w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex gap-2 col-span-2 sm:col-span-1">
                {PLATFORM_OPTIONS.map((opt) => (
                  <Button key={opt.value} size="sm"
                    variant={platform === opt.value ? 'default' : 'outline'}
                    onClick={() => setPlatform(opt.value)}
                    className="flex-1 sm:flex-none">
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={fetchData} disabled={loading} className="col-span-2 sm:col-span-1 w-full sm:w-auto">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards — all clickable */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {metrics.map((card) => {
            const Icon = card.icon;
            const isActive = activeMetric === card.key;
            return (
              <button
                key={card.key}
                onClick={() => setActiveMetric(card.key)}
                className={`text-left rounded-xl border transition-all duration-150 p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring ${
                  isActive
                    ? 'ring-2 shadow-md bg-white'
                    : 'bg-white hover:bg-gray-50/60'
                }`}
                style={isActive ? { ringColor: card.chartColor, borderColor: card.chartColor } : {}}
              >
                {isActive && (
                  <div className="h-1 rounded-full mb-3 -mt-1 -mx-1" style={{ backgroundColor: card.chartColor }} />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${card.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {loading ? <span className="inline-block h-5 w-16 bg-gray-100 rounded animate-pulse" /> : card.value}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{card.title}</p>
                {card.hint && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.hint}</p>}
              </button>
            );
          })}
        </div>

        {/* Dynamic Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: active.chartColor }} />
              <div>
                <CardTitle className="text-base">{active.title} Over Time</CardTitle>
                <CardDescription>
                  Daily {active.title.toLowerCase()} in selected date range
                  {active.hint && <span className="ml-1 text-gray-400">· {active.hint}</span>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <MetricOverTimeChart
                key={activeMetric}
                data={metricsOverTime || []}
                metric={activeMetric}
                color={active.chartColor}
                formatter={active.formatter}
              />
            )}
          </CardContent>
        </Card>

        {/* Per Campaign Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Breakdown</CardTitle>
            <CardDescription>Performance metrics per campaign</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Campaign</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Platform</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">CTR</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">CPC</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Spend</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Conversions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">CPL</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : !perCampaign || perCampaign.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                        No ad metrics found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    perCampaign.map((row) => {
                      const rowRoas = row.spend > 0 ? ((row.conversions / row.spend) * 1000).toFixed(2) : '—';
                      return (
                        <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.campaign?.name || 'Unknown'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.campaign?.platform === 'meta' ? 'purple' : 'destructive'}>
                              {row.campaign?.platform || '-'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatNumber(row.impressions)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatNumber(row.clicks)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatPercent(row.ctr * 100)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.cpc)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(row.spend)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatNumber(row.conversions)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.costPerLead)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{rowRoas !== '—' ? `${rowRoas}x` : '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
