'use client';

import { X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import LeadStatusBadge from './LeadStatusBadge';
import StatusChangeControl from './StatusChangeControl';
import RemarksPanel from './RemarksPanel';
import LeadTimeline from './LeadTimeline';
import { formatDateTime } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/use-permission';
import { useSession } from 'next-auth/react';

/**
 * Full-screen mobile / slide-over desktop drawer for a lead's detail view.
 * Works for both Social and Data Entry leads.
 *
 * @param {object}   props
 * @param {object}   props.lead         - The lead document (populated)
 * @param {string}   props.leadType     - 'social' | 'dataentry'
 * @param {boolean}  props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onUpdate     - Called with updated lead doc after status change
 * @param {node}     [props.outreachPanel] - Outreach panel component injected from parent
 */
export default function LeadDetailDrawer({ lead, leadType, isOpen, onClose, onUpdate, outreachPanel }) {
  const isAdmin = useIsAdmin();
  const { data: session } = useSession();

  if (!isOpen || !lead) return null;

  const title = leadType === 'social'
    ? lead.customer_id_url
    : lead.business_name;

  const subtitle = leadType === 'social'
    ? `${lead.platform_id?.name || ''} — ${lead.social_account_id?.account_name || ''}`
    : `${lead.city || ''} ${lead.business_category ? `· ${lead.business_category}` : ''}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <LeadStatusBadge status={lead.status} />
              {leadType === 'dataentry' && (
                <span className="text-xs text-gray-400 capitalize">{lead.contact_type}</span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 truncate">{title}</h2>
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex border-b px-4 flex-shrink-0 gap-1">
            {['details', 'remarks', 'timeline', ...(outreachPanel ? ['outreach'] : [])].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-3 py-2.5 text-sm font-medium capitalize border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:text-red-600 text-gray-500 hover:text-gray-900 transition-colors"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* ── Details tab ─────────────────────────────────── */}
            <TabsContent value="details" className="p-5 space-y-5">
              {/* Status control */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
                <StatusChangeControl
                  leadId={lead._id}
                  leadType={leadType}
                  currentStatus={lead.status}
                  ownerUserId={lead.owner_user_id?._id || lead.owner_user_id}
                  onSuccess={onUpdate}
                />
              </div>

              {/* Lead fields */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  {leadType === 'social' ? (
                    <>
                      <Field label="Platform" value={lead.platform_id?.name} />
                      <Field label="ID Account" value={lead.social_account_id?.account_name} />
                      <Field label="Niche" value={lead.target_niche_id?.name} />
                      <Field label="Created By" value={lead.created_by?.name} />
                      <div className="col-span-2">
                        <Field label="Customer URL" value={lead.customer_id_url} link={lead.customer_id_url} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Field label="Business Name" value={lead.business_name} />
                      <Field label="Owner Name" value={lead.owner_name} />
                      <Field label="Category" value={lead.business_category} />
                      <Field label="City" value={lead.city} />
                      <Field label="Phone" value={lead.phone_number} />
                      <Field label="Email" value={lead.email_address} />
                      <Field label="Website" value={lead.website} link={lead.website} />
                      <Field label="Reviews" value={lead.num_reviews} />
                      <div className="col-span-2">
                        <Field label="Pain Points" value={lead.pain_points} />
                      </div>
                      <div className="col-span-2">
                        <Field label="Observed On" value={lead.observed_on} />
                      </div>
                    </>
                  )}
                  <Field label="Created" value={formatDateTime(lead.createdAt)} />
                  <Field label="Owner" value={lead.owner_user_id?.name || '—'} />
                  {lead.assigned_to && <Field label="Assigned To" value={lead.assigned_to?.name} />}
                </div>
              </div>
            </TabsContent>

            {/* ── Remarks tab ──────────────────────────────────── */}
            <TabsContent value="remarks" className="p-5">
              <RemarksPanel leadId={lead._id} leadType={leadType} canEdit />
            </TabsContent>

            {/* ── Timeline tab ─────────────────────────────────── */}
            <TabsContent value="timeline" className="p-5">
              <LeadTimeline leadId={lead._id} leadType={leadType} />
            </TabsContent>

            {/* ── Outreach tab (optional) ───────────────────────── */}
            {outreachPanel && (
              <TabsContent value="outreach" className="p-5">
                {outreachPanel}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </>
  );
}

function Field({ label, value, link }) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline truncate block"
        >
          {String(value)}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-900 break-words">{String(value)}</p>
      )}
    </div>
  );
}
