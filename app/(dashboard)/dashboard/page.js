'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import {
  Users, TrendingUp, DollarSign, Activity,
  ArrowUpRight, Target, Calendar, BarChart2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LeadsOverTimeChart from '@/components/charts/LeadsOverTimeChart';
import LeadsByPlatformChart from '@/components/charts/LeadsByPlatformChart';
import LeadsByServiceChart from '@/components/charts/LeadsByServiceChart';
import SpendOverTimeChart from '@/components/charts/SpendOverTimeChart';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils';

const statusColors = {
  new: 'info',
  contacted: 'warning',
  converted: 'success',
  closed: 'outline',
};

const sourceColors = { meta: 'purple', google: 'destructive', manual: 'secondary' };

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { summary, charts, recentLeads } = data || {};
  const isAdmin = session?.user?.role === 'admin';

  const summaryCards = [
    {
      title: 'Leads Today',
      value: summary?.leadsToday ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Leads This Week',
      value: summary?.leadsWeek ?? 0,
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Leads This Month',
      value: summary?.leadsMonth ?? 0,
      icon: Target,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Active Campaigns',
      value: summary?.activeCampaigns ?? 0,
      icon: Activity,
      color: 'bg-orange-50 text-orange-600',
    },
    ...(isAdmin
      ? [
          {
            title: 'Total Ad Spend (30d)',
            value: formatCurrency(summary?.totalSpend),
            icon: DollarSign,
            color: 'bg-red-50 text-red-600',
          },
          {
            title: 'Conversion Rate',
            value: formatPercent(summary?.conversionRate),
            icon: TrendingUp,
            color: 'bg-teal-50 text-teal-600',
          },
        ]
      : []),
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your leads and ad performance" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leads Over Time</CardTitle>
              <CardDescription>Daily leads received in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsOverTimeChart data={charts?.leadsOverTime || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leads by Service</CardTitle>
              <CardDescription>Distribution across services</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsByServiceChart data={charts?.leadsByService || []} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leads by Platform</CardTitle>
              <CardDescription>Meta vs Google in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadsByPlatformChart data={charts?.leadsByPlatform || []} />
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ad Spend Over Time</CardTitle>
                <CardDescription>Daily spend in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendOverTimeChart data={charts?.spendOverTime || []} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Leads</CardTitle>
                <CardDescription>Last 20 leads received</CardDescription>
              </div>
              <a href="/leads" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Received</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned To</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(recentLeads || []).map((lead) => (
                    <tr
                      key={lead._id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/leads?id=${lead._id}`}
                    >
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-xs text-gray-400">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sourceColors[lead.source] || 'secondary'}>
                          {lead.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.service}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[lead.status] || 'secondary'}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDateTime(lead.receivedAt)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {lead.assignedTo?.name || <span className="text-gray-400">Unassigned</span>}
                      </td>
                    </tr>
                  ))}
                  {(!recentLeads || recentLeads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No leads yet. Leads will appear here after syncing.
                      </td>
                    </tr>
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
