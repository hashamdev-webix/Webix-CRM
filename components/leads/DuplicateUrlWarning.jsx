'use client';

import { AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import LeadStatusBadge from './LeadStatusBadge';
import { formatDateTime } from '@/lib/utils';

/**
 * Shown below the Customer ID URL field when a duplicate is detected.
 * @param {object} props
 * @param {boolean} props.blocked  - If true, submit is disabled and a red error is shown
 * @param {object} props.lead      - Existing lead data
 * @param {string} props.message   - Message from the server
 */
export default function DuplicateUrlWarning({ blocked, lead, message }) {
  if (!lead) return null;

  return (
    <div className={`rounded-lg border p-4 mt-2 space-y-2 ${blocked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2">
        {blocked
          ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        }
        <p className={`text-sm font-medium ${blocked ? 'text-red-700' : 'text-amber-700'}`}>
          {message}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/60 rounded p-2">
          <p className="text-gray-500 mb-0.5">Owner</p>
          <p className="font-medium">{lead.owner || 'Unassigned'}</p>
        </div>
        <div className="bg-white/60 rounded p-2">
          <p className="text-gray-500 mb-0.5">Status</p>
          <LeadStatusBadge status={lead.status} />
        </div>
        <div className="bg-white/60 rounded p-2">
          <p className="text-gray-500 mb-0.5">Created</p>
          <p className="font-medium">{formatDateTime(lead.createdAt)}</p>
        </div>
        {lead.last_remark && (
          <div className="bg-white/60 rounded p-2 col-span-2">
            <p className="text-gray-500 mb-0.5">Last remark</p>
            <p className="font-medium truncate">{lead.last_remark}</p>
          </div>
        )}
      </div>
    </div>
  );
}
