'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

export default function RemarksPanel({ leadId, leadType, canEdit = true }) {
  const [remarks, setRemarks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const base = leadType === 'social'
    ? `/api/leads/social/${leadId}/remarks`
    : `/api/leads/data-entry/${leadId}/remarks`;

  const fetchRemarks = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${base}?page=${p}`);
      if (p === 1) {
        setRemarks(res.data.remarks);
      } else {
        setRemarks((prev) => [...prev, ...res.data.remarks]);
      }
      setTotal(res.data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { fetchRemarks(1); }, [fetchRemarks]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.post(base, { remark_text: text.trim() });
      // Optimistic prepend
      setRemarks((prev) => [res.data, ...prev]);
      setTotal((t) => t + 1);
      setText('');
      toast({ title: 'Remark added', variant: 'success' });
    } catch {
      toast({ title: 'Failed to add remark', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Add a remark..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !text.trim()}>
            {submitting ? 'Adding...' : 'Add Remark'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {loading && page === 1 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))
        ) : remarks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No remarks yet.</p>
        ) : (
          remarks.map((r) => (
            <div key={r._id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {r.created_by?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{r.created_by?.name || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.remark_text}</p>
              </div>
            </div>
          ))
        )}

        {remarks.length < total && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => fetchRemarks(page + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : `Load more (${total - remarks.length} remaining)`}
          </Button>
        )}
      </div>
    </div>
  );
}
