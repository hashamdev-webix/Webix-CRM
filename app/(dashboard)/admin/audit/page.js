'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EVENT_COLORS = {
  'lead.created': 'success',
  'lead.status_changed': 'info',
  'lead.locked': 'warning',
  'lead.reassigned': 'purple',
  'role.created': 'secondary',
  'role.updated': 'secondary',
  'role.deleted': 'destructive',
  'outreach.email_sent': 'info',
  'outreach.call_logged': 'warning',
  'config.created': 'secondary',
  'config.updated': 'secondary',
  'config.deleted': 'destructive',
};

function formatAuditDetail(event_type, metadata = {}) {
  const m = metadata || {};
  switch (event_type) {
    case 'lead.created':
      return 'Lead was created';
    case 'lead.status_changed':
      return `Status changed: "${m.from}" → "${m.to}"${m.notes ? ` — ${m.notes}` : ''}`;
    case 'lead.locked':
      return `Lead locked at status "${m.status}"`;
    case 'lead.reassigned':
      return `Lead reassigned${m.from ? ` from user ${m.from}` : ''}${m.to ? ` to user ${m.to}` : ''}`;
    case 'outreach.email_sent':
      return `Email outreach logged${m.account ? ` from ${m.account}` : ''}`;
    case 'outreach.call_logged':
      return `Call logged — outcome: ${m.outcome || 'unknown'}${m.notes ? ` — "${m.notes}"` : ''}`;
    case 'role.created':
      return `Role "${m.name}" was created`;
    case 'role.updated':
      return `Role "${m.name}" was updated`;
    case 'role.deleted':
      return `Role "${m.name}" was deleted`;
    case 'role.permissions_updated':
      return `Permissions updated for role "${m.name}"`;
    case 'config.created':
      return `${m.entity || 'Item'} "${m.name}" was added`;
    case 'config.updated':
      return `${m.entity || 'Item'} "${m.name}" was updated`;
    case 'config.deleted':
      return `${m.entity || 'Item'} "${m.name}" was deleted`;
    case 'user.role_assigned':
      return `Role "${m.role}" assigned to user`;
    case 'user.role_revoked':
      return `Role "${m.role}" removed from user`;
    default: {
      const parts = Object.entries(m)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
      return parts.length > 0 ? parts.join(' · ') : '—';
    }
  }
}

function MetadataRow({ event_type, metadata }) {
  if (!metadata || Object.keys(metadata).length === 0) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="text-xs text-gray-700">{formatAuditDetail(event_type, metadata)}</span>
  );
}

export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ event_type: '', entity_type: '', startDate: '', endDate: '' });

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: 50 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await axios.get(`/api/admin/audit?${params}`);
      setEvents(res.data.events);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);

  return (
    <>
      <Header title="Audit Log" subtitle="Immutable record of all system actions" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Event Type</label>
                <Input
                  placeholder="e.g. lead.created"
                  className="h-9"
                  value={filters.event_type}
                  onChange={(e) => setFilters((f) => ({ ...f, event_type: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Entity Type</label>
                <Input
                  placeholder="e.g. lead_social"
                  className="h-9"
                  value={filters.entity_type}
                  onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Start Date</label>
                <Input type="date" className="h-9" value={filters.startDate}
                  onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">End Date</label>
                <Input type="date" className="h-9" value={filters.endDate}
                  onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Actor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : events.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No audit events found.</td></tr>
                  ) : events.map((ev) => (
                    <tr key={ev._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{formatDateTime(ev.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{ev.actor_user_id?.name || 'System'}</p>
                        <p className="text-xs text-gray-400">{ev.actor_user_id?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={EVENT_COLORS[ev.event_type] || 'secondary'} className="text-xs">
                          {ev.event_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{ev.entity_type}</p>
                        <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{ev.entity_id}</p>
                      </td>
                      <td className="px-4 py-3"><MetadataRow event_type={ev.event_type} metadata={ev.metadata} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-gray-500">{total} total events</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchEvents(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs">{page}/{pages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchEvents(page + 1)} disabled={page >= pages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
