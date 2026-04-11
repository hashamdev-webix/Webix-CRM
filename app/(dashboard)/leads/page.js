'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  X, ChevronUp, ChevronDown, ChevronsUpDown, Plus,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatDateTime, formatDate } from '@/lib/utils';

const STATUS_OPTIONS = ['new', 'contacted', 'converted', 'closed'];
const SOURCE_OPTIONS = ['meta', 'google', 'manual'];
const SERVICE_OPTIONS = ['Digital Marketing', 'Graphic Designing', 'Web Development'];

const statusColors = {
  new: 'info',
  contacted: 'warning',
  converted: 'success',
  closed: 'outline',
};

const sourceColors = { meta: 'purple', google: 'destructive', manual: 'secondary' };

function SortIcon({ field, sortField, sortOrder }) {
  if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-gray-300" />;
  return sortOrder === 'asc'
    ? <ChevronUp className="h-3 w-3 text-blue-500" />
    : <ChevronDown className="h-3 w-3 text-blue-500" />;
}

function LeadDetailPanel({ lead, onClose, onUpdate, isAdmin, teamMembers }) {
  const [status, setStatus] = useState(lead?.status || '');
  const [notes, setNotes] = useState(lead?.notes || '');
  const [assignedTo, setAssignedTo] = useState(lead?.assignedTo?._id || lead?.assignedTo || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || '');
      setNotes(lead.notes || '');
      setAssignedTo(lead.assignedTo?._id || lead.assignedTo || '');
    }
  }, [lead]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { status, notes };
      if (isAdmin) payload.assignedTo = assignedTo || null;
      const res = await axios.patch(`/api/leads/${lead._id}`, payload);
      onUpdate(res.data);
      toast({ title: 'Lead updated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to update lead', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-white shadow-2xl border-l flex flex-col">
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h2 className="font-semibold text-lg">{lead.name}</h2>
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Source</p>
            <Badge variant={sourceColors[lead.source] || 'secondary'}>{lead.source}</Badge>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Service</p>
            <p className="text-sm font-medium">{lead.service}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="text-sm font-medium">{lead.phone || '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Campaign</p>
            <p className="text-sm font-medium">{lead.campaignId?.name || '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 col-span-2">
            <p className="text-xs text-gray-500 mb-1">Received At</p>
            <p className="text-sm font-medium">{formatDateTime(lead.receivedAt)}</p>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assign (admin only) */}
        {isAdmin && (
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m._id} value={m._id}>{m.name} ({m.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <textarea
            className="w-full min-h-[120px] p-3 text-sm border border-input rounded-md bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add notes about this lead..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="p-5 border-t">
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function LeadsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === 'admin';

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    service: '',
    assignedTo: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      params.set('sortField', sortField);
      params.set('sortOrder', sortOrder);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await axios.get(`/api/leads?${params}`);
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast({ title: 'Failed to load leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/users').then((res) => setTeamMembers(res.data)).catch(() => {});
    }
  }, [isAdmin]);

  // Open lead from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      axios.get(`/api/leads/${id}`).then((res) => setSelectedLead(res.data)).catch(() => {});
    }
  }, [searchParams]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleLeadUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
    setSelectedLead(updated);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.open(`/api/export?${params}`, '_blank');
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <Header title="Leads" subtitle={`${total} total leads`} />
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-3 md:gap-4">

        {/* Toolbar */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, email, phone..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="info" className="ml-2 py-0">{activeFiltersCount}</Badge>
            )}
          </Button>

          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => { setFilters((f) => ({ ...f, status: v === 'all' ? '' : v })); setPage(1); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Source</Label>
                  <Select value={filters.source} onValueChange={(v) => { setFilters((f) => ({ ...f, source: v === 'all' ? '' : v })); setPage(1); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All sources" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Service</Label>
                  <Select value={filters.service} onValueChange={(v) => { setFilters((f) => ({ ...f, service: v === 'all' ? '' : v })); setPage(1); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All services" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All services</SelectItem>
                      {SERVICE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-1">
                    <Label className="text-xs">Assigned To</Label>
                    <Select value={filters.assignedTo} onValueChange={(v) => { setFilters((f) => ({ ...f, assignedTo: v === 'all' ? '' : v })); setPage(1); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All members" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All members</SelectItem>
                        {teamMembers.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" className="h-9" value={filters.startDate} onChange={(e) => { setFilters((f) => ({ ...f, startDate: e.target.value })); setPage(1); }} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" className="h-9" value={filters.endDate} onChange={(e) => { setFilters((f) => ({ ...f, endDate: e.target.value })); setPage(1); }} />
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setFilters({ search: '', status: '', source: '', service: '', assignedTo: '', startDate: '', endDate: '' }); setPage(1); }}>
                  <X className="h-3 w-3 mr-1" /> Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table / Card list */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile card list */}
          <div className="md:hidden flex-1 overflow-auto divide-y">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                </div>
              ))
            ) : leads.length === 0 ? (
              <div className="px-6 py-16 text-center text-gray-400 text-sm">
                No leads found. Try adjusting your filters.
              </div>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead._id}
                  className="p-4 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{lead.name}</div>
                      <div className="text-xs text-gray-400 truncate">{lead.email}</div>
                    </div>
                    <Badge variant={statusColors[lead.status] || 'secondary'} className="capitalize text-xs shrink-0">
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={sourceColors[lead.source] || 'secondary'} className="capitalize text-xs">
                      {lead.source}
                    </Badge>
                    <span className="text-xs text-gray-500">{lead.service}</span>
                    {lead.assignedTo?.name && (
                      <span className="text-xs text-gray-400">{lead.assignedTo.name}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(lead.receivedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:flex flex-col flex-1 overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b">
                    {[
                      { label: 'Name', field: 'name' },
                      { label: 'Source', field: 'source' },
                      { label: 'Service', field: 'service' },
                      { label: 'Status', field: 'status' },
                      { label: 'Assigned To', field: 'assignedTo' },
                      { label: 'Received', field: 'receivedAt' },
                    ].map(({ label, field }) => (
                      <th
                        key={field}
                        className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-gray-900 select-none whitespace-nowrap"
                        onClick={() => handleSort(field)}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          <SortIcon field={field} sortField={sortField} sortOrder={sortOrder} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                        No leads found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead._id}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{lead.name}</div>
                          <div className="text-xs text-gray-400">{lead.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sourceColors[lead.source] || 'secondary'} className="capitalize">
                            {lead.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.service}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColors[lead.status] || 'secondary'} className="capitalize">
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.assignedTo?.name || <span className="text-gray-300">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(lead.receivedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
            <p className="text-xs md:text-sm text-gray-500">
              {total > 0 ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}` : '0 results'}
            </p>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs md:text-sm px-1 md:px-2">{page}/{pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Lead Detail Side Panel */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setSelectedLead(null)}
          />
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleLeadUpdate}
            isAdmin={isAdmin}
            teamMembers={teamMembers}
          />
        </>
      )}
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsContent />
    </Suspense>
  );
}
