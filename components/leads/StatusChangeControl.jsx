'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import LeadStatusBadge from './LeadStatusBadge';
import { LOCK_ON_STATUSES } from '@/lib/lead-status-constants';
import { useIsAdmin } from '@/hooks/use-permission';
import { useSession } from 'next-auth/react';

const ALL_STATUSES = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];

export default function StatusChangeControl({ leadId, leadType, currentStatus, ownerUserId, onSuccess }) {
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if this user can change status
  const isLocked = LOCK_ON_STATUSES.includes(currentStatus);
  const isOwner = ownerUserId === session?.user?.id;
  const canEdit = isAdmin || !isLocked || isOwner;

  const handleSave = async () => {
    if (newStatus === currentStatus) return;
    setSaving(true);
    // Optimistic UI — parent will update after success
    try {
      const endpoint = leadType === 'social'
        ? `/api/leads/social/${leadId}`
        : `/api/leads/data-entry/${leadId}`;
      const res = await axios.patch(endpoint, { status: newStatus, status_notes: notes });
      toast({ title: 'Status updated', variant: 'success' });
      onSuccess?.(res.data);
      setNotes('');
    } catch (err) {
      toast({
        title: 'Failed to update status',
        description: err.response?.data?.error || 'Unknown error',
        variant: 'destructive',
      });
      setNewStatus(currentStatus); // revert optimistic
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <LeadStatusBadge status={currentStatus} />
        <span className="text-xs">(Locked to owner)</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {newStatus !== currentStatus && (
        <div className="space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <textarea
            className="w-full min-h-[60px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Reason for status change..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || newStatus === currentStatus}
        className="w-full"
      >
        {saving ? 'Saving...' : 'Update Status'}
      </Button>
    </div>
  );
}
