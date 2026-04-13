'use client';

import { Mail, Phone, AlertCircle } from 'lucide-react';

/**
 * Shows a compact outreach status pill for a lead row.
 * @param {{ emails_sent, calls_made, last_call_outcome }} outreach
 */
export default function OutreachStatusBadge({ outreach }) {
  if (!outreach) return <NotContacted />;

  const { emails_sent = 0, calls_made = 0, last_call_outcome } = outreach;

  if (emails_sent === 0 && calls_made === 0) return <NotContacted />;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {emails_sent > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
          <Mail className="h-3 w-3" />
          {emails_sent} email{emails_sent > 1 ? 's' : ''}
        </span>
      )}
      {calls_made > 0 && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${outcomeStyle(last_call_outcome)}`}>
          <Phone className="h-3 w-3" />
          {callLabel(last_call_outcome, calls_made)}
        </span>
      )}
    </div>
  );
}

function NotContacted() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-100">
      <AlertCircle className="h-3 w-3" />
      Not contacted
    </span>
  );
}

function outcomeStyle(outcome) {
  switch (outcome) {
    case 'interested': return 'bg-green-50 text-green-700 border-green-100';
    case 'not_interested': return 'bg-red-50 text-red-600 border-red-100';
    case 'follow_up_requested': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'connected': return 'bg-blue-50 text-blue-700 border-blue-100';
    default: return 'bg-orange-50 text-orange-700 border-orange-100';
  }
}

function callLabel(outcome, count) {
  const suffix = count > 1 ? ` (×${count})` : '';
  switch (outcome) {
    case 'interested': return `Interested${suffix}`;
    case 'not_interested': return `Not Interested${suffix}`;
    case 'follow_up_requested': return `Follow-up Req.${suffix}`;
    case 'no_answer': return `No Answer${suffix}`;
    case 'connected': return `Connected${suffix}`;
    default: return `Called${suffix}`;
  }
}
