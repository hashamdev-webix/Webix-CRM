'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer';
import OutreachPanel from '@/components/leads/OutreachPanel';
import OutreachStatusBadge from '@/components/leads/OutreachStatusBadge';
import { Plus, Minus, ChevronLeft, ChevronRight, Zap, Trash2, X } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { PhoneInputField } from '@/components/ui/phone-input';

const STATUS_OPTIONS = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];

// ─── Add Lead Form ────────────────────────────────────────────────────────────
function AddLeadForm({ onSuccess }) {
  const [platforms, setPlatforms] = useState([]);
  const [niches, setNiches] = useState([]);
  const [form, setForm] = useState({
    platform_name: '', business_name: '', owner_name: '', business_category: '',
    city: '', phone_number: '', email_address: '', website: '', num_reviews: '',
    pain_points: '', observed_on: '', initial_remark: '',
  });
  const [socialLinks, setSocialLinks] = useState([{ platform_id: '', url: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/config/platforms'),
      axios.get('/api/admin/config/niches'),
    ]).then(([pRes, nRes]) => {
      setPlatforms(pRes.data.filter((p) => p.is_active));
      setNiches(nRes.data.filter((n) => n.is_active));
    });
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.business_name.trim()) {
      toast({ title: 'Business name is required', variant: 'destructive' });
      return;
    }
    if (!form.phone_number && !form.email_address.trim()) {
      toast({ title: 'At least one of phone or email is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        num_reviews: form.num_reviews ? parseInt(form.num_reviews) : null,
        social_links: socialLinks.filter((l) => l.url.trim()),
      };
      const res = await axios.post('/api/leads/data-entry', payload);
      toast({ title: 'Lead created successfully', variant: 'success' });
      onSuccess?.(res.data);
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to create lead', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addSocialLink = () => setSocialLinks((prev) => [...prev, { platform_id: '', url: '' }]);
  const removeSocialLink = (i) => setSocialLinks((prev) => prev.filter((_, idx) => idx !== i));
  const setSocialLink = (i, k, v) => setSocialLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  return (
    <Card className="max-w-3xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Platform Name</Label>
              <Input placeholder="e.g. Google Maps" value={form.platform_name} onChange={(e) => set('platform_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Business Name <span className="text-red-500">*</span></Label>
              <Input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Owner Name</Label>
              <Input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Business Category</Label>
              <Input value={form.business_category} onChange={(e) => set('business_category', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Number of Reviews</Label>
              <Input type="number" min="0" value={form.num_reviews} onChange={(e) => set('num_reviews', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <PhoneInputField
                value={form.phone_number}
                onChange={(val) => set('phone_number', val)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input type="email" value={form.email_address} onChange={(e) => set('email_address', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Website</Label>
              <Input type="url" placeholder="https://..." value={form.website} onChange={(e) => set('website', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observed On</Label>
              <Input placeholder="e.g. Google Maps, Facebook Group" value={form.observed_on} onChange={(e) => set('observed_on', e.target.value)} />
            </div>
          </div>

          {/* Pain Points */}
          <div className="space-y-1">
            <Label>Pain Points (optional)</Label>
            <textarea className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Observed business pain points..." value={form.pain_points} onChange={(e) => set('pain_points', e.target.value)} />
          </div>

          {/* Social Links */}
          <div className="space-y-2">
            <Label>Social Links (optional)</Label>
            {socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Select value={link.platform_id} onValueChange={(v) => setSocialLink(i, 'platform_id', v)}>
                  <SelectTrigger className="w-40 flex-shrink-0">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="URL" value={link.url} onChange={(e) => setSocialLink(i, 'url', e.target.value)} className="flex-1" />
                {socialLinks.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSocialLink(i)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
              <Plus className="h-4 w-4 mr-1" /> Add Social Link
            </Button>
          </div>

          {/* Initial Remark */}
          <div className="space-y-1">
            <Label>Initial Remark (optional)</Label>
            <textarea className="w-full min-h-[60px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="First note about this lead..." value={form.initial_remark} onChange={(e) => set('initial_remark', e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Creating Lead...' : 'Create Lead'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Lead List (one contact_type sub-tab) ─────────────────────────────────────
function ContactLeadList({ contactType, scope }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const canViewAll = usePermission('leads.dataentry.view.all');
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/admin/config/companies').then((r) => setCompanies(r.data.filter((c) => c.is_active))).catch(() => {});
    }
  }, [isAdmin]);

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true);
    setChecked(new Set());
    try {
      const params = new URLSearchParams({ page: p, pageSize: 25, contact_type: contactType });
      if (statusFilter) params.set('status', statusFilter);
      if (companyFilter) params.set('company', companyFilter);
      if (canViewAll && scope === 'mine') params.set('mine', 'true');
      const res = await axios.get(`/api/leads/data-entry?${params}`);
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [contactType, statusFilter, companyFilter, scope, canViewAll]);

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
      await axios.delete('/api/leads/data-entry', { data: { ids: [...checked] } });
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
      await axios.delete(`/api/leads/data-entry/${id}`);
      toast({ title: 'Lead deleted', variant: 'success' });
      setLeads((prev) => prev.filter((l) => l._id !== id));
      setChecked((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setTotal((t) => t - 1);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const handleStartOutreach = async (lead, e) => {
    e.stopPropagation();
    try {
      const res = await axios.patch(`/api/leads/data-entry/${lead._id}/start-outreach`);
      setLeads((prev) => prev.map((l) => l._id === lead._id ? { ...l, ...res.data } : l));
      toast({ title: 'Outreach started', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => l._id === updated._id ? { ...l, ...updated } : l));
    setSelectedLead(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && companies.length > 0 && (
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <p className="text-sm text-gray-500 ml-2">{total} leads</p>
        {isAdmin && checked.size > 0 && (
          <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={deleting} className="gap-1.5 ml-auto">
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'Deleting…' : `Delete ${checked.size} selected`}
          </Button>
        )}
        {isAdmin && checked.size > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())} className="gap-1 text-gray-400">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></div>
          )) : leads.map((lead) => (
            <div key={lead._id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="font-medium text-sm">{lead.business_name}</p>
                  <p className="text-xs text-gray-400">{lead.city}</p>
                </div>
                <LeadStatusBadge status={lead.status} />
              </div>
              <div className="mt-1.5"><OutreachStatusBadge outreach={lead.outreach} /></div>
              <div className="flex items-center gap-3 mt-2">
                {(contactType === 'email' || contactType === 'both') && lead.email_address && (
                  <p className="text-xs text-gray-600">{lead.email_address}</p>
                )}
                {(contactType === 'phone' || contactType === 'both') && lead.phone_number && (
                  <p className="text-xs text-gray-600">{lead.phone_number}</p>
                )}
                {lead.status === 'new' && (
                  <Button size="sm" variant="outline" className="ml-auto text-xs" onClick={(e) => handleStartOutreach(lead, e)}>
                    <Zap className="h-3 w-3 mr-1" />Start
                  </Button>
                )}
              </div>
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
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 cursor-pointer"
                      checked={leads.length > 0 && checked.size === leads.length}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Outreach</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Last Remark</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: isAdmin ? 11 : 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : leads.length === 0 ? (
                <tr><td colSpan={isAdmin ? 11 : 10} className="px-6 py-12 text-center text-gray-400">No leads found.</td></tr>
              ) : leads.map((lead) => (
                <tr
                  key={lead._id}
                  className={`cursor-pointer transition-colors ${checked.has(lead._id) ? 'bg-red-50/40' : 'hover:bg-blue-50/30'}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleCheck(lead._id); }}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 cursor-pointer"
                        checked={checked.has(lead._id)}
                        onChange={() => toggleCheck(lead._id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-700">{lead.created_by?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.business_name}</p>
                    <p className="text-xs text-gray-400">{lead.owner_name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.business_category || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.city || '—'}</td>
                  <td className="px-4 py-3">
                    {(contactType === 'email' || contactType === 'both') && lead.email_address && (
                      <p className="text-xs">{lead.email_address}</p>
                    )}
                    {(contactType === 'phone' || contactType === 'both') && lead.phone_number && (
                      <p className="text-xs text-gray-500">{lead.phone_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3"><OutreachStatusBadge outreach={lead.outreach} /></td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">
                    {lead.last_remark?.remark_text || '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {lead.status === 'new' && (
                        <Button size="sm" variant="outline" onClick={(e) => handleStartOutreach(lead, e)}>
                          <Zap className="h-3 w-3 mr-1" />Start
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2" onClick={(e) => deleteSingle(lead._id, e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-gray-500">{total} leads</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs">{page}/{pages}</span>
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page + 1)} disabled={page >= pages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          leadType="dataentry"
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          outreachPanel={<OutreachPanel lead={selectedLead} leadType="dataentry" />}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataEntryLeadsPage() {
  const [activeTab, setActiveTab] = useState('email');
  const [topTab, setTopTab] = useState('list');
  const [scope, setScope] = useState('all'); // 'all' | 'mine'
  const canViewAll = usePermission('leads.dataentry.view.all');

  const SUB_TABS = [
    { id: 'email', label: 'Email Only' },
    { id: 'phone', label: 'Phone Only' },
    { id: 'both', label: 'Email + Phone' },
  ];

  return (
    <>
      <Header title="Data Entry Leads" subtitle="Manually sourced business leads" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Top tabs */}
        <div className="flex gap-1 border-b">
          {[{ id: 'list', label: 'Lead Lists' }, { id: 'add', label: '+ Add Lead' }].map((tab) => (
            <button key={tab.id} onClick={() => setTopTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                topTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {topTab === 'add' ? (
          <AddLeadForm onSuccess={() => setTopTab('list')} />
        ) : (
          <>
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

            {/* Sub-tabs for contact type */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
              {SUB_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <ContactLeadList key={`${activeTab}-${scope}`} contactType={activeTab} scope={scope} />
          </>
        )}
      </div>
    </>
  );
}
