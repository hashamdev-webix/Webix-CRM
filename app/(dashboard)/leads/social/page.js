'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import DuplicateUrlWarning from '@/components/leads/DuplicateUrlWarning';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer';
import { Search, ChevronLeft, ChevronRight, ExternalLink, Trash2, X, UserPlus, CalendarDays } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';

// ── Assign Popover ─────────────────────────────────────────────────────────────
function AssignPopover({ lead, users, onAssigned, apiPath }) {
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapRef = useRef(null);
  const btnRef  = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // decide whether to open upward
  const handleOpen = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 220);
    }
    setOpen(o => !o);
  };

  const assign = async (userId) => {
    setSaving(true);
    try {
      const res = await axios.patch(apiPath, { assigned_to: userId || null });
      onAssigned(res.data);
      setOpen(false);
      toast({ title: userId ? 'Lead assigned' : 'Assignment removed', variant: 'success' });
    } catch { toast({ title: 'Failed to assign', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const assignedId = lead.assigned_to?._id || lead.assigned_to;

  return (
    <div className="relative" ref={wrapRef}>
      <button ref={btnRef} onClick={handleOpen}
        className={`p-1.5 rounded-lg transition-colors ${open ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}
        title="Assign lead">
        <UserPlus className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className={`absolute right-0 z-[999] bg-white border border-gray-200 rounded-xl shadow-2xl w-52 py-1.5 text-sm
            ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-1">
            Assign to
          </p>
          {assignedId && (
            <button onClick={() => assign(null)} disabled={saving}
              className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 text-xs flex items-center gap-2">
              <X className="h-3 w-3" /> Remove assignment
            </button>
          )}
          {users.map(u => {
            const isAssigned = assignedId === u._id?.toString() || assignedId?.toString() === u._id?.toString();
            return (
              <button key={u._id} onClick={() => assign(u._id)} disabled={saving}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors
                  ${isAssigned ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                  {u.name?.[0]?.toUpperCase()}
                </span>
                <span className="truncate">{u.name}</span>
                {isAssigned && <span className="ml-auto text-blue-400 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [scope, setScope] = useState('all');
  const [status, setStatus]       = useState('');
  const [platform, setPlatform]   = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers]         = useState([]);
  const [checked, setChecked]     = useState(new Set());
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    axios.get('/api/admin/config/platforms').then((r) => setPlatforms(r.data)).catch(() => {});
    if (isAdmin) {
      axios.get('/api/admin/config/companies').then((r) => setCompanies(r.data.filter((c) => c.is_active))).catch(() => {});
      axios.get('/api/users').then((r) => setUsers(Array.isArray(r.data) ? r.data : r.data?.users || [])).catch(() => {});
    }
  }, [isAdmin]);

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true);
    setChecked(new Set());
    try {
      const params = new URLSearchParams({ page: p, pageSize: 25 });
      if (search)    params.set('search', search);
      if (status)    params.set('status', status);
      if (platform)  params.set('platform', platform);
      if (createdBy) params.set('createdBy', createdBy);
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate', endDate);
      if (canViewAll && scope === 'mine') params.set('mine', 'true');
      const res = await axios.get(`/api/leads/social?${params}`);
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, status, platform, createdBy, startDate, endDate, scope, canViewAll]);

  const toggleCheck = (id) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (checked.size === leads.length) setChecked(new Set());
    else setChecked(new Set(leads.map((l) => l._id)));
  };

  const deleteSelected = async () => {
    if (!checked.size) return;
    if (!confirm(`Delete ${checked.size} lead${checked.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.delete('/api/leads/social', { data: { ids: [...checked] } });
      toast({ title: `${checked.size} lead${checked.size > 1 ? 's' : ''} deleted`, variant: 'success' });
      fetchLeads(page);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const deleteSingle = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/leads/social/${id}`);
      toast({ title: 'Lead deleted', variant: 'success' });
      setLeads((prev) => prev.filter((l) => l._id !== id));
      setChecked((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setTotal((t) => t - 1);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => l._id === updated._id ? { ...l, ...updated } : l));
    setSelectedLead(updated);
  };

  const STATUS_OPTIONS = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];
  const hasActiveFilter = !!(status || platform || createdBy || startDate || endDate || search);

  const clearFilters = () => {
    setStatus(''); setPlatform(''); setCreatedBy('');
    setStartDate(''); setEndDate(''); setSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Scope toggle */}
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

      {/* Filter bar — always visible */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Row 1: search + status + platform + created by */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search leads..." className="pl-9 h-9 w-52"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Platform</Label>
              <Select value={platform || 'all'} onValueChange={(v) => setPlatform(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="All platforms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {platforms.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {users.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Created By</Label>
                <Select value={createdBy || 'all'} onValueChange={(v) => setCreatedBy(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All members" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-400 gap-1 self-end mb-0.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            {isAdmin && checked.size > 0 && (
              <div className="flex items-center gap-2 ml-auto self-end">
                <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={deleting} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? 'Deleting…' : `Delete ${checked.size}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())} className="gap-1 text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          {/* Row 2: date range */}
          <div className="flex flex-wrap items-end gap-3">
            <CalendarDays className="h-4 w-4 text-gray-400 self-end mb-2 flex-shrink-0" />
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">From</Label>
              <Input type="date" className="h-9 w-38" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">To</Label>
              <Input type="date" className="h-9 w-38" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 self-end mb-2">{total} lead{total !== 1 ? 's' : ''}</p>
          </div>
        </CardContent>
      </Card>

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
              {lead.assigned_to && <p className="text-xs text-blue-500 mt-1">Assigned: {lead.assigned_to.name}</p>}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded border-gray-300 text-red-600 cursor-pointer"
                      checked={leads.length > 0 && checked.size === leads.length}
                      onChange={toggleAll} />
                  </th>
                )}
                {['Created By', 'Platform', 'Account', 'Niche', 'URL', 'Status', 'Assigned To', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
                {isAdmin && <th className="px-4 py-3 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: isAdmin ? 10 : 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : leads.length === 0 ? (
                <tr><td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center text-gray-400">No social leads found.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead._id}
                  className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${checked.has(lead._id) ? 'bg-red-50/40' : ''}`}
                  onClick={() => setSelectedLead(lead)}>
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleCheck(lead._id); }}>
                      <input type="checkbox" className="rounded border-gray-300 text-red-600 cursor-pointer"
                        checked={checked.has(lead._id)} onChange={() => {}} />
                    </td>
                  )}
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
                  <td className="px-4 py-3">
                    {lead.assigned_to
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{lead.assigned_to.name}</span>
                      : <span className="text-gray-300 text-xs">Unassigned</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(lead.createdAt)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <AssignPopover lead={lead} users={users}
                          apiPath={`/api/leads/social/${lead._id}`}
                          onAssigned={(updated) => setLeads(prev => prev.map(l => l._id === updated._id ? { ...l, ...updated } : l))} />
                        <button onClick={(e) => deleteSingle(lead._id, e)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
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
