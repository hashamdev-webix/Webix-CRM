'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Users, UserCheck, UserX, Clock, Building2, TrendingUp,
  Plus, ArrowRight, Briefcase, DollarSign, CheckCircle2,
  FileText, TrendingDown, Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
  resigned: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  intern: 'Intern',
};

const TYPE_COLORS = {
  full_time: 'bg-blue-100 text-blue-700',
  part_time: 'bg-purple-100 text-purple-700',
  contract: 'bg-orange-100 text-orange-700',
  intern: 'bg-pink-100 text-pink-700',
};

function EmployeeAvatar({ employee, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (employee.profilePhoto?.filePath) {
    return (
      <img
        src={`/api/hr/files/${employee.profilePhoto.filePath}`}
        alt={`${employee.firstName} ${employee.lastName}`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className={`${sizeClass} rounded-full bg-red-600 text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function HRDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/hr/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary        = stats?.summary        || {};
  const deptBreakdown  = stats?.deptBreakdown  || [];
  const typeBreakdown  = stats?.typeBreakdown  || [];
  const recentHires    = stats?.recentHires    || [];
  const payroll        = stats?.payrollSummary || null;

  const summaryCards = [
    { label: 'Active Employees', value: summary.totalActive ?? 0, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
    { label: 'On Leave', value: summary.onLeave ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
    { label: 'Inactive / Exited', value: summary.totalInactive ?? 0, icon: UserX, color: 'bg-red-50 text-red-600', border: 'border-red-200' },
    { label: 'Departments', value: summary.totalDepts ?? 0, icon: Building2, color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
  ];

  return (
    <>
      <Header title="HR & People" subtitle="Employee management overview" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/hr/employees/new">
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </Link>
          <Link href="/hr/employees">
            <Button size="sm" variant="outline">
              <Users className="h-4 w-4 mr-2" /> View All Employees
            </Button>
          </Link>
          <Link href="/hr/departments">
            <Button size="sm" variant="outline">
              <Building2 className="h-4 w-4 mr-2" /> Manage Departments
            </Button>
          </Link>
          <Link href="/hr/payroll">
            <Button size="sm" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" /> Payroll
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={`border ${card.border}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '—' : formatNumber(card.value)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                Headcount by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : deptBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {deptBreakdown.map((d) => {
                    const total = summary.totalActive + summary.onLeave || 1;
                    const pct = Math.round((d.count / total) * 100);
                    return (
                      <div key={d._id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{d.name || 'Unassigned'}</span>
                          <span className="text-gray-500">{d.count} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employment Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                Employment Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : typeBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No data</p>
              ) : (
                <div className="space-y-2">
                  {typeBreakdown.map((t) => (
                    <div key={t._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[t._id] || 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[t._id] || t._id}
                      </span>
                      <span className="text-sm font-bold text-gray-700">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Payroll Summary ── */}
        {(loading || payroll) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                Latest Payroll
                {!loading && payroll && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {payroll.monthName} {payroll.year}
                  </span>
                )}
              </h2>
              <Link href="/hr/payroll">
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-900">
                  Open Payroll <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : !payroll ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No payroll records yet</p>
                  <p className="text-xs text-gray-300 mt-1">Run your first payroll from the Payroll page</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 4 metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Total Net Paid */}
                  <Card className="border-0 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-600/10 rounded-bl-full" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Net Paid</p>
                          <p className="text-xl font-bold text-white leading-tight">
                            PKR {Number(payroll.totalNet).toLocaleString('en-PK')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{payroll.employeeCount} employees</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Wallet className="h-4 w-4 text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Earnings */}
                  <Card className="border border-green-100 bg-green-50">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Total Earnings</p>
                          <p className="text-xl font-bold text-green-800 leading-tight">
                            PKR {Number(payroll.totalEarnings).toLocaleString('en-PK')}
                          </p>
                          <p className="text-xs text-green-500 mt-1">Basic + Allowances</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Deductions */}
                  <Card className="border border-red-100 bg-red-50">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Total Deductions</p>
                          <p className="text-xl font-bold text-red-700 leading-tight">
                            PKR {Number(payroll.totalDeductions).toLocaleString('en-PK')}
                          </p>
                          <p className="text-xs text-red-400 mt-1">Deductions + Absent</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-red-200 flex items-center justify-center flex-shrink-0">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status */}
                  <Card className={`border ${payroll.finalizedCount === payroll.employeeCount ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${payroll.finalizedCount === payroll.employeeCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                            Status
                          </p>
                          <p className={`text-xl font-bold leading-tight ${payroll.finalizedCount === payroll.employeeCount ? 'text-emerald-800' : 'text-amber-700'}`}>
                            {payroll.finalizedCount === payroll.employeeCount ? 'Finalized' : 'In Draft'}
                          </p>
                          <p className={`text-xs mt-1 ${payroll.finalizedCount === payroll.employeeCount ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {payroll.finalizedCount}/{payroll.employeeCount} finalized
                          </p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${payroll.finalizedCount === payroll.employeeCount ? 'bg-emerald-200' : 'bg-amber-200'}`}>
                          {payroll.finalizedCount === payroll.employeeCount
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <FileText className="h-4 w-4 text-amber-600" />
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Department salary breakdown */}
                {payroll.deptBreakdown?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        Salary by Department — {payroll.monthName} {payroll.year}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {payroll.deptBreakdown.map((d, i) => {
                          const pct = payroll.totalNet > 0 ? Math.round((d.totalNet / payroll.totalNet) * 100) : 0;
                          const colors = ['bg-red-500','bg-blue-500','bg-green-500','bg-purple-500','bg-amber-500','bg-pink-500'];
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                                  <span className="font-medium text-gray-700">{d.deptName || 'No Department'}</span>
                                  <span className="text-xs text-gray-400">({d.count} emp)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400">{pct}%</span>
                                  <span className="font-semibold text-gray-800 tabular-nums">
                                    PKR {Number(d.totalNet).toLocaleString('en-PK')}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Recent Hires */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                Recent Hires
              </CardTitle>
              <Link href="/hr/employees">
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-900">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : recentHires.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No employees yet</p>
            ) : (
              <div className="divide-y">
                {recentHires.map((emp) => (
                  <Link key={emp._id} href={`/hr/employees/${emp._id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <EmployeeAvatar employee={emp} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{emp.designation || '—'} · {emp.department?.name || 'No Dept'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{emp.employeeId}</p>
                      {emp.joinDate && (
                        <p className="text-xs text-gray-500">
                          {new Date(emp.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
