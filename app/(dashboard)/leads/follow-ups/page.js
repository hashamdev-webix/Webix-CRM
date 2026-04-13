'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import { Clock, CheckCircle, AlertTriangle, Bell } from 'lucide-react';

function getOverdueLabel(dueAt) {
  const diffMs = Date.now() - new Date(dueAt).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor(diffMs / (1000 * 60));
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h overdue`;
  if (diffH >= 1) return `${diffH}h overdue`;
  return `${diffM}m overdue`;
}

function getUpcomingLabel(dueAt) {
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor(diffMs / (1000 * 60));
  if (diffH >= 24) return `in ${Math.floor(diffH / 24)}d`;
  if (diffH >= 1) return `in ${diffH}h`;
  return `in ${diffM}m`;
}

function isOverdue(dueAt) {
  return new Date(dueAt) < new Date();
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/follow-ups?includeCompleted=${includeCompleted}`);
      setFollowUps(res.data);
    } catch {
      toast({ title: 'Failed to load follow-ups', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const handleComplete = async (fu) => {
    try {
      await axios.patch('/api/follow-ups', { follow_up_id: fu._id });
      setFollowUps((prev) => prev.map((f) => f._id === fu._id ? { ...f, completed_at: new Date().toISOString() } : f));
      toast({ title: 'Follow-up marked complete', variant: 'success' });
    } catch {
      toast({ title: 'Failed to complete follow-up', variant: 'destructive' });
    }
  };

  const pending = followUps.filter((f) => !f.completed_at);
  const overdue = pending.filter((f) => isOverdue(f.due_at));
  const upcoming = pending.filter((f) => !isOverdue(f.due_at));
  const completed = followUps.filter((f) => f.completed_at);

  return (
    <>
      <Header title="Follow-ups" subtitle="Track and complete scheduled follow-ups" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Overdue alert banner */}
        {overdue.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3 animate-pulse">
            <Bell className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              {overdue.length} follow-up{overdue.length > 1 ? 's' : ''} overdue — reach out or update status now
            </p>
          </div>
        )}

        {/* Summary badges */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {overdue.length > 0 && <Badge variant="destructive">{overdue.length} overdue</Badge>}
            {upcoming.length > 0 && <Badge variant="warning">{upcoming.length} upcoming</Badge>}
            {completed.length > 0 && includeCompleted && <Badge variant="success">{completed.length} completed</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setIncludeCompleted(!includeCompleted)}>
            {includeCompleted ? 'Hide Completed' : 'Show Completed'}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : followUps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">All caught up! No follow-ups pending.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Overdue section */}
            {overdue.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Overdue
                </p>
                {overdue.map((fu) => <FollowUpCard key={fu._id} fu={fu} onComplete={handleComplete} />)}
              </>
            )}

            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Clock className="h-3.5 w-3.5" /> Upcoming
                </p>
                {upcoming.map((fu) => <FollowUpCard key={fu._id} fu={fu} onComplete={handleComplete} />)}
              </>
            )}

            {/* Completed section */}
            {includeCompleted && completed.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <CheckCircle className="h-3.5 w-3.5" /> Completed
                </p>
                {completed.map((fu) => <FollowUpCard key={fu._id} fu={fu} onComplete={handleComplete} />)}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function FollowUpCard({ fu, onComplete }) {
  const overdueFu = !fu.completed_at && isOverdue(fu.due_at);
  const lead = fu.lead;
  const leadName = lead?.business_name || lead?.customer_id_url || 'Unknown Lead';

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 transition-all ${
      fu.completed_at
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : overdueFu
        ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${overdueFu ? 'text-red-500' : fu.completed_at ? 'text-green-500' : 'text-gray-400'}`}>
        {fu.completed_at ? <CheckCircle className="h-5 w-5" /> : overdueFu ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-sm truncate">{leadName}</p>
          <Badge variant={fu.lead_type === 'social' ? 'purple' : 'secondary'} className="text-xs">
            {fu.lead_type}
          </Badge>
          {lead?.status && <LeadStatusBadge status={lead.status} />}
          {fu.completed_at && <Badge variant="success" className="text-xs">Done</Badge>}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="text-gray-400">Due: {formatDateTime(fu.due_at)}</span>
          {!fu.completed_at && (
            <span className={`font-semibold ${overdueFu ? 'text-red-600' : 'text-amber-600'}`}>
              {overdueFu ? getOverdueLabel(fu.due_at) : getUpcomingLabel(fu.due_at)}
            </span>
          )}
          {fu.completed_at && (
            <span className="text-green-600">Completed {formatDateTime(fu.completed_at)}</span>
          )}
        </div>

        {fu.assigned_to && (
          <p className="text-xs text-gray-400 mt-0.5">Assigned: {fu.assigned_to?.name || fu.assigned_to}</p>
        )}
      </div>

      {/* Actions */}
      {!fu.completed_at && (
        <Button
          size="sm"
          variant={overdueFu ? 'default' : 'outline'}
          className={overdueFu ? 'bg-red-600 hover:bg-red-700 text-white flex-shrink-0' : 'flex-shrink-0'}
          onClick={() => onComplete(fu)}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Done
        </Button>
      )}
    </div>
  );
}
