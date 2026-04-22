'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Users, TrendingUp, AlertCircle, UserMinus, Wallet,
  ExternalLink, ChevronRight as Arrow,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICES = ['SMM', 'SEO', 'Google Ads', 'Meta Ads', 'Web Development', 'Graphic Design', 'Video Editing', 'Flutter App', 'CRM', 'GMB', 'Content Writing', 'Other'];

const STATUS_CONFIG = {
  active:           { label: 'Active',           color: 'bg-emerald-100 text-emerald-700' },
  on_hold:          { label: 'On Hold',          color: 'bg-orange-100 text-orange-700' },
  under_review:     { label: 'Under Review',     color: 'bg-yellow-100 text-yellow-700' },
  trial:            { label: 'Trial / Pilot',    color: 'bg-blue-100 text-blue-700' },
  completed:        { label: 'Completed',         color: 'bg-teal-100 text-teal-700' },
  churned:          { label: 'Churned',           color: 'bg-red-100 text-red-700' },
  potential_upsell: { label: 'Potential Upsell', color: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function ServiceTag({ service }) {
  const colors = {
    SMM: 'bg-blue-50 text-blue-700', SEO: 'bg-green-50 text-green-700',
    'Google Ads': 'bg-yellow-50 text-yellow-700', 'Meta Ads': 'bg-indigo-50 text-indigo-700',
    'Web Development': 'bg-purple-50 text-purple-700', 'Graphic Design': 'bg-pink-50 text-pink-700',
    CRM: 'bg-gray-100 text-gray-700',
  };
  const cls = colors[service] || 'bg-gray-50 text-gray-600';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{service}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 leading-none">{value ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [salesFilter, setSalesFilter] = useState('');

  const fetchClients = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: 25 });
      if (search)        params.set('search', search);
      if (statusFilter)  params.set('status', statusFilter);
      if (serviceFilter) params.set('service', serviceFilter);
      if (salesFilter)   params.set('salesPerson', salesFilter);
      const res = await axios.get(`/api/clients?${params}`);
      setClients(res.data.clients);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch {
      toast({ title: 'Failed to load clients', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [search, statusFilter, serviceFilter, salesFilter]);

  useEffect(() => { fetchClients(1); }, [fetchClients]);

  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/users').then(r => setUsers(Array.isArray(r.data) ? r.data : r.data?.users || [])).catch(() => {});
    }
  }, [isAdmin]);

  // Simple stats from current data
  const activeCount   = clients.filter(c => c.status === 'active').length;
  const churnedCount  = clients.filter(c => c.status === 'churned').length;
  const totalRevenue  = clients.reduce((s, c) => s + (c.total_received || 0), 0);
  const totalOutstanding = clients.reduce((s, c) => s + Math.max(0, c.outstanding_balance || 0), 0);

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setServiceFilter(''); setSalesFilter('');
  };
  const hasFilter = !!(search || statusFilter || serviceFilter || salesFilter);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Clients" subtitle="Manage your paying clients and project relationships" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active Clients"     value={activeCount}                                         icon={Users}      iconBg="bg-emerald-50"  iconColor="text-emerald-600" />
          <StatCard label="Total Revenue (PKR)" value={`PKR ${totalRevenue.toLocaleString()}`}             icon={Wallet}     iconBg="bg-blue-50"     iconColor="text-blue-600" />
          <StatCard label="Outstanding (PKR)"  value={`PKR ${totalOutstanding.toLocaleString()}`}         icon={AlertCircle}iconBg="bg-orange-50"   iconColor="text-orange-600" />
          <StatCard label="Churned"            value={churnedCount}                                       icon={UserMinus}  iconBg="bg-red-50"      iconColor="text-red-600" />
        </div>

        {/* Filters + Add button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input className="pl-8 h-9" value={search}
              onChange={e => setSearch(e.target.value)} placeholder="Search clients..." />
          </div>

          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={v => setServiceFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All services" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {isAdmin && users.length > 0 && (
            <Select value={salesFilter} onValueChange={v => setSalesFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All sales" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All team members</SelectItem>
                {users.map(u => <SelectItem key={u._id} value={u._id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-400">
              Clear filters
            </Button>
          )}

          <div className="ml-auto">
            <Button size="sm" onClick={() => router.push('/clients/new')} className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Client
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Services</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Sales Person</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Contract Start</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Outstanding</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                )) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No clients found.</p>
                      <Button size="sm" onClick={() => router.push('/clients/new')} className="mt-3 bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="h-4 w-4 mr-1" /> Add First Client
                      </Button>
                    </td>
                  </tr>
                ) : clients.map(client => (
                  <tr key={client._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${client._id}`)}>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {client.brand_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{client.brand_name}</p>
                          <p className="text-xs text-gray-400">{client.contact_name} {client.location ? `· ${client.location}` : ''}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(client.services || []).slice(0, 3).map(s => <ServiceTag key={s} service={s} />)}
                        {client.services?.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{client.services.length - 3}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                      {client.sales_person_id?.name || '—'}
                    </td>

                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {client.contract_start_date ? formatDate(client.contract_start_date) : '—'}
                    </td>

                    {isAdmin && (
                      <td className="px-4 py-3 hidden lg:table-cell text-xs">
                        {client.outstanding_balance > 0 ? (
                          <span className="text-red-600 font-medium">
                            PKR {client.outstanding_balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs">Paid</span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                        onClick={() => router.push(`/clients/${client._id}`)}>
                        <Arrow className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">{total} client{total !== 1 ? 's' : ''} total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchClients(page - 1)} disabled={page <= 1 || loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-600 min-w-[60px] text-center">{page} / {pages}</span>
              <Button variant="outline" size="sm" onClick={() => fetchClients(page + 1)} disabled={page >= pages || loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
