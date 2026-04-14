'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import DuplicateUrlWarning from '@/components/leads/DuplicateUrlWarning';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer';
import OutreachStatusBadge from '@/components/leads/OutreachStatusBadge';
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';

// ─── Add Lead Form ────────────────────────────────────────────────────────────
function AddLeadForm({ onSuccess }) {
  const { data: session } = useSession();
  const [platforms, setPlatforms] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [form, setForm] = useState({ platform_id: '', social_account_id: '', target_niche_id: '', customer_id_url: '', initial_remark: '' });
  const [duplicate, setDuplicate] = useState(null); // { blocked, lead, message }
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/config/platforms'),
      axios.get('/api/admin/config/niches'),
    ]).then(([pRes, nRes]) => {
      setPlatforms(pRes.data.filter((p) => p.type === 'social' && p.is_active));
      setNiches(nRes.data.filter((n) => n.is_active));
    });
  }, []);

  const handlePlatformChange = async (platformId) => {
    setForm((f) => ({ ...f, platform_id: platformId, social_account_id: '' }));
    if (!platformId) { setAccounts([]); return; }
    const res = await axios.get('/api/admin/config/social_accounts');
    setAccounts(res.data.filter((a) => a.platform_id?._id === platformId && a.is_active));
  };

  const handleUrlBlur = async () => {
    const url = form.customer_id_url.trim();
    if (!url) { setDuplicate(null); return; }
    setCheckingUrl(true);
    try {
      const res = await axios.get(`/api/leads/social/check-url?url=${encodeURIComponent(url)}`);
      setDuplicate(res.data.duplicate ? res.data : null);
    } catch {
      setDuplicate(null);
    } finally {
      setCheckingUrl(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duplicate?.blocked) return;
    if (!form.platform_id || !form.social_account_id || !form.customer_id_url.trim()) {
      toast({ title: 'Platform, ID Account, and Customer URL are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post('/api/leads/social', form);
      toast({ title: 'Lead created successfully', variant: 'success' });
      onSuccess?.(res.data);
      setForm({ platform_id: '', social_account_id: '', target_niche_id: '', customer_id_url: '', initial_remark: '' });
      setDuplicate(null);
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to create lead', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Assigned salesperson */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-gray-400">Logged-in user (lead creator)</p>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-1">
            <Label>Platform <span className="text-red-500">*</span></Label>
            <Select value={form.platform_id} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ID Account */}
          <div className="space-y-1">
            <Label>ID Name (Account) <span className="text-red-500">*</span></Label>
            <Select
              value={form.social_account_id}
              onValueChange={(v) => setForm((f) => ({ ...f, social_account_id: v }))}
              disabled={!form.platform_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.platform_id ? 'Select account' : 'Select platform first'} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Target Niche */}
          <div className="space-y-1">
            <Label>Target Niche</Label>
            <Select value={form.target_niche_id} onValueChange={(v) => setForm((f) => ({ ...f, target_niche_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select niche (optional)" />
              </SelectTrigger>
              <SelectContent>
                {niches.map((n) => <SelectItem key={n._id} value={n._id}>{n.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Customer ID URL */}
          <div className="space-y-1">
            <Label>Customer ID URL <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type="url"
                placeholder="https://..."
                value={form.customer_id_url}
                onChange={(e) => { setForm((f) => ({ ...f, customer_id_url: e.target.value })); setDuplicate(null); }}
                onBlur={handleUrlBlur}
              />
              {checkingUrl && <p className="text-xs text-gray-400 mt-1">Checking for duplicates...</p>}
            </div>
            {duplicate && (
              <DuplicateUrlWarning
                blocked={duplicate.blocked}
                lead={duplicate.lead}
                message={duplicate.message}
              />
            )}
          </div>

          {/* Initial Remark */}
          <div className="space-y-1">
            <Label>Initial Remark (optional)</Label>
            <textarea
              className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add initial notes about this lead..."
              value={form.initial_remark}
              onChange={(e) => setForm((f) => ({ ...f, initial_remark: e.target.value }))}
            />
          </div>

          {/* Status (read-only) */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-500">Status:</span>
            <LeadStatusBadge status="new" />
            <span className="text-xs text-gray-400">(Status is set after creation)</span>
          </div>

          <Button type="submit" className="w-full" disabled={saving || duplicate?.blocked}>
            {saving ? 'Creating Lead...' : 'Create Lead'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Lead List ────────────────────────────────────────────────────────────────
function LeadList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const canViewAll = usePermission('leads.social.view.all');
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [scope, setScope] = useState('all'); // 'all' | 'mine'
  const [filters, setFilters] = useState({ status: '', platform: '', company: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    axios.get('/api/admin/config/platforms').then((r) => setPlatforms(r.data)).catch(() => {});
    if (isAdmin) {
      axios.get('/api/admin/config/companies').then((r) => setCompanies(r.data.filter((c) => c.is_active))).catch(() => {});
    }
  }, [isAdmin]);

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: 25 });
      if (filters.status) params.set('status', filters.status);
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.company) params.set('company', filters.company);
      if (canViewAll && scope === 'mine') params.set('mine', 'true');
      const res = await axios.get(`/api/leads/social?${params}`);
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [filters, scope, canViewAll]);

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => l._id === updated._id ? { ...l, ...updated } : l));
    setSelectedLead(updated);
  };

  const STATUS_OPTIONS = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];

  // Mobile card view + desktop table
  return (
    <div className="space-y-4">
      {/* Scope toggle — only for users with view.all permission */}
      {canViewAll && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {[{ id: 'all', label: 'All Leads' }, { id: 'mine', label: 'My Leads' }].map((s) => (
            <button key={s.id} onClick={() => setScope(s.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                scope === s.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search leads..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Platform</Label>
                <Select value={filters.platform} onValueChange={(v) => setFilters((f) => ({ ...f, platform: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All platforms" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    {platforms.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && companies.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Select value={filters.company} onValueChange={(v) => setFilters((f) => ({ ...f, company: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All companies" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companies.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
            </div>
          )) : leads.map((lead) => (
            <div key={lead._id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-blue-600 truncate">{lead.customer_id_url}</p>
                <LeadStatusBadge status={lead.status} />
              </div>
              <p className="text-xs text-gray-500">{lead.platform_id?.name} · {lead.social_account_id?.account_name}</p>
              <div className="mt-1.5"><OutreachStatusBadge outreach={lead.outreach} /></div>
              {lead.last_remark && <p className="text-xs text-gray-400 mt-1 truncate">{lead.last_remark.remark_text}</p>}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Created By', 'Platform', 'Account', 'Niche', 'URL', 'Status', 'Outreach', 'Owner', 'Created', 'Last Remark'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : leads.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400">No social leads found.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => setSelectedLead(lead)}>
                  <td className="px-4 py-3 text-gray-700">{lead.created_by?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.platform_id?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.social_account_id?.account_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.target_niche_id?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <a href={lead.customer_id_url} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline flex items-center gap-1 max-w-[160px] truncate">
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{lead.customer_id_url}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3"><OutreachStatusBadge outreach={lead.outreach} /></td>
                  <td className="px-4 py-3 text-gray-600">{lead.owner_user_id?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">
                    {lead.last_remark?.remark_text || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-gray-500">{total} leads</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">{page}/{pages}</span>
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page + 1)} disabled={page >= pages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          leadType="social"
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SocialLeadsPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <>
      <Header title="Social Leads" subtitle="Manage leads sourced from social platforms" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        <div className="flex gap-1 border-b">
          {[{ id: 'list', label: 'Lead List' }, { id: 'add', label: '+ Add Lead' }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'list' ? (
          <LeadList />
        ) : (
          <AddLeadForm onSuccess={() => setActiveTab('list')} />
        )}
      </div>
    </>
  );
}
