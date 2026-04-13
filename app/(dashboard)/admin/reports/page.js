'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Mail, Phone, Trophy, Users, TrendingUp, Target } from 'lucide-react';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'text-red-600', bg = 'bg-red-50' }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`${bg} rounded-lg p-3 flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  new: 'bg-gray-400',
  active: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  won: 'bg-green-500',
  not_interested: 'bg-slate-400',
  closed: 'bg-red-400',
};

const PLATFORM_COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'];

function BarChart({ rows = [], colorMap, defaultColor = 'bg-red-500', emptyText = 'No data' }) {
  const total = rows.reduce((s, r) => s + (r.count || 0), 0);
  if (rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        const color = colorMap?.[row._id] || PLATFORM_COLORS[i % PLATFORM_COLORS.length] || defaultColor;
        return (
          <div key={row._id || i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize font-medium text-gray-700">{(row._id || 'Unknown').replace('_', ' ')}</span>
              <span className="text-gray-500 font-semibold">{row.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-400 text-right pt-1">Total: {total}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const base = new URLSearchParams({ startDate, endDate });

      if (activeTab === 'overview') {
        const res = await axios.get(`/api/admin/reports?report=overview&${base}`);
        setData(res.data);
      } else if (activeTab === 'performance') {
        const res = await axios.get(`/api/admin/reports?report=performance&${base}`);
        setPerfData(res.data);
      } else if (activeTab === 'company') {
        const res = await axios.get(`/api/admin/reports?report=company&${base}`);
        setCompanyData(res.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const TABS = [
    { id: 'overview', label: 'Status Overview' },
    { id: 'performance', label: 'Team Performance' },
    { id: 'company', label: 'By Company' },
  ];

  // Summary totals from overview data
  const totalSocial = data?.socialByStatus?.reduce((s, r) => s + r.count, 0) || 0;
  const totalDataEntry = data?.dataentryByStatus?.reduce((s, r) => s + r.count, 0) || 0;
  const wonSocial = data?.socialByStatus?.find((r) => r._id === 'won')?.count || 0;
  const wonDataEntry = data?.dataentryByStatus?.find((r) => r._id === 'won')?.count || 0;
  const activeSocial = data?.socialByStatus?.find((r) => r._id === 'active')?.count || 0;
  const activeDataEntry = data?.dataentryByStatus?.find((r) => r._id === 'active')?.count || 0;

  return (
    <>
      <Header title="Reports" subtitle="Analytics across all leads and team activity" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

        {/* Date filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" className="h-9 w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" className="h-9 w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button size="sm" onClick={fetchReport} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Social Leads" value={totalSocial} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
              <StatCard label="Total Data Entry Leads" value={totalDataEntry} icon={Target} color="text-teal-600" bg="bg-teal-50" />
              <StatCard label="Deals Won" value={wonSocial + wonDataEntry} icon={Trophy} color="text-green-600" bg="bg-green-50" />
              <StatCard label="Active Leads" value={activeSocial + activeDataEntry} icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Social Leads by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart rows={data?.socialByStatus || []} colorMap={STATUS_COLORS} emptyText="No social leads" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Data Entry Leads by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart rows={data?.dataentryByStatus || []} colorMap={STATUS_COLORS} emptyText="No data entry leads" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Social Leads by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart rows={data?.socialByPlatform || []} emptyText="No platform data" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Data Entry Leads by Contact Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    rows={data?.dataentryByContact || []}
                    colorMap={{ email: 'bg-indigo-500', phone: 'bg-orange-500', both: 'bg-teal-500' }}
                    emptyText="No contact type data"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── By Company ── */}
        {activeTab === 'company' && (
          <div className="space-y-5">
            {companyData && companyData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Companies" value={companyData.length} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Total Leads" value={companyData.reduce((s, r) => s + r.totalLeads, 0)} icon={Target} color="text-teal-600" bg="bg-teal-50" />
                <StatCard label="Total Won" value={companyData.reduce((s, r) => s + r.won, 0)} icon={Trophy} color="text-green-600" bg="bg-green-50" />
                <StatCard label="Active" value={companyData.reduce((s, r) => s + r.active, 0)} icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !companyData || companyData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-400">
                  No companies found. Add companies in Admin → Configuration.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyData.map((row) => (
                  <Card key={row.company.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-gray-800">{row.company.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {row.won > 0 && (
                            <Badge className="bg-green-100 text-green-700 text-xs">{row.won} won</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{row.totalLeads} total</Badge>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3 text-indigo-400" />{row.socialLeads} social</span>
                        <span className="flex items-center gap-1"><Target className="h-3 w-3 text-teal-400" />{row.dataEntryLeads} data entry</span>
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-amber-400" />{row.active} active</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <BarChart rows={row.byStatus} colorMap={STATUS_COLORS} emptyText="No leads yet" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Performance ── */}
        {activeTab === 'performance' && (
          <div className="space-y-5">
            {/* Team summary cards */}
            {perfData && Array.isArray(perfData) && perfData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Team Members" value={perfData.length} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Total Leads" value={perfData.reduce((s, r) => s + r.totalLeads, 0)} icon={Target} color="text-teal-600" bg="bg-teal-50" />
                <StatCard label="Total Won" value={perfData.reduce((s, r) => s + r.won, 0)} icon={Trophy} color="text-green-600" bg="bg-green-50" />
                <StatCard label="Emails Sent" value={perfData.reduce((s, r) => s + r.emailsSent, 0)} icon={Mail} color="text-blue-600" bg="bg-blue-50" />
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Member', 'Total Leads', 'Active', 'Won', 'Emails', 'Calls', 'Follow-up %'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}</tr>
                      )) : !perfData || perfData.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No performance data for this period.</td></tr>
                      ) : perfData.map((row) => (
                        <tr key={row.user?.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{row.user?.name}</p>
                            <p className="text-xs text-gray-400">{row.user?.email}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold">{row.totalLeads}</td>
                          <td className="px-4 py-3"><Badge variant="info">{row.active}</Badge></td>
                          <td className="px-4 py-3"><Badge variant="success">{row.won}</Badge></td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-gray-700">
                              <Mail className="h-3.5 w-3.5 text-indigo-400" />{row.emailsSent}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-gray-700">
                              <Phone className="h-3.5 w-3.5 text-orange-400" />{row.callsMade}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                                <div
                                  className={`h-full rounded-full ${row.followUpsCompliance >= 80 ? 'bg-green-500' : row.followUpsCompliance >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                                  style={{ width: `${row.followUpsCompliance}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${row.followUpsCompliance >= 80 ? 'text-green-600' : row.followUpsCompliance >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                {row.followUpsCompliance}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
