'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatDateTime } from '@/lib/utils';
import {
  PlusCircle, ArrowRight, MessageSquare, Mail, Phone,
  Clock, Lock, UserCheck, Zap, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EVENT_CONFIG = {
  lead_created:      { icon: PlusCircle,  color: 'text-green-500',  label: 'Lead created' },
  status_changed:    { icon: ArrowRight,  color: 'text-blue-500',   label: 'Status changed' },
  remark_added:      { icon: MessageSquare, color: 'text-gray-500', label: 'Remark added' },
  email_sent:        { icon: Mail,        color: 'text-indigo-500', label: 'Email sent' },
  email_reply_logged:{ icon: Mail,        color: 'text-indigo-400', label: 'Reply logged' },
  call_logged:       { icon: Phone,       color: 'text-orange-500', label: 'Call logged' },
  follow_up_created: { icon: Clock,       color: 'text-yellow-500', label: 'Follow-up created' },
  follow_up_completed:{ icon: CheckCircle,color: 'text-green-400',  label: 'Follow-up completed' },
  lead_locked:       { icon: Lock,        color: 'text-red-500',    label: 'Lead locked' },
  lead_reassigned:   { icon: UserCheck,   color: 'text-purple-500', label: 'Lead reassigned' },
  outreach_started:  { icon: Zap,         color: 'text-teal-500',   label: 'Outreach started' },
};

function eventDescription(event) {
  const d = event.event_data || {};
  switch (event.event_type) {
    case 'status_changed':
      return `Status: "${d.from}" → "${d.to}"${d.notes ? ` — ${d.notes}` : ''}`;
    case 'email_sent':
      return `Sent from ${d.sending_account || 'unknown account'}`;
    case 'call_logged':
      return `Outcome: ${d.outcome?.replace('_', ' ') || '—'}`;
    case 'follow_up_created':
      return `Due: ${d.due_at ? new Date(d.due_at).toLocaleString() : '—'}`;
    case 'remark_added':
      return d.preview ? `"${d.preview}${d.preview.length >= 100 ? '…' : ''}"` : '';
    default:
      return '';
  }
}

export default function LeadTimeline({ leadId, leadType }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const base = leadType === 'social'
    ? `/api/leads/social/${leadId}/timeline`
    : `/api/leads/data-entry/${leadId}/timeline`;

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${base}?page=${p}`);
      if (p === 1) {
        setEvents(res.data.events);
      } else {
        setEvents((prev) => [...prev, ...res.data.events]);
      }
      setTotal(res.data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);

  return (
    <div className="space-y-1">
      {loading && page === 1 ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse mb-2" />
        ))
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No timeline events yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {events.map((event) => {
              const cfg = EVENT_CONFIG[event.event_type] || { icon: PlusCircle, color: 'text-gray-400', label: event.event_type };
              const Icon = cfg.icon;
              const desc = eventDescription(event);
              return (
                <div key={event._id} className="flex gap-3 pl-1">
                  <div className={`w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 relative z-10 mt-0.5`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
                      {event.created_by?.name && (
                        <span className="text-xs text-gray-500">by {event.created_by.name}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{formatDateTime(event.createdAt)}</span>
                    </div>
                    {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length < total && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => fetchEvents(page + 1)}
          disabled={loading}
        >
          {loading ? 'Loading...' : `Load more (${total - events.length} remaining)`}
        </Button>
      )}
    </div>
  );
}
