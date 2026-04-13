import connectDB from '@/lib/mongodb';
import LeadStatusHistory from '@/models/LeadStatusHistory';
import LeadTimeline from '@/models/LeadTimeline';
import { writeAudit } from '@/lib/audit';

import { LOCK_ON_STATUSES, LOCK_OFF_STATUSES, ALL_STATUSES } from '@/lib/lead-status-constants';
export { LOCK_ON_STATUSES, LOCK_OFF_STATUSES, ALL_STATUSES };

/**
 * Returns true if this status transition requires locking the lead.
 * Lock happens on first transition INTO a lock-on status.
 */
export function shouldLock(newStatus) {
  return LOCK_ON_STATUSES.includes(newStatus);
}

/**
 * Check whether a user can change a lead's status.
 * Returns { allowed: bool, reason: string | null }
 */
export function canChangeStatus({ lead, userId, userRole }) {
  if (userRole === 'admin') return { allowed: true, reason: null };

  if (LOCK_ON_STATUSES.includes(lead.status)) {
    const ownerId = lead.owner_user_id?.toString();
    if (ownerId && ownerId !== userId) {
      return {
        allowed: false,
        reason: `Lead is locked to another team member (Status: ${lead.status}).`,
      };
    }
  }
  return { allowed: true, reason: null };
}

/**
 * Persist a status change: update the lead doc, write status history, write timeline event, write audit.
 * The caller is responsible for saving the lead document after this call.
 *
 * @param {object} opts
 * @param {object} opts.lead         - Mongoose document (not yet saved)
 * @param {string} opts.leadType     - 'social' | 'dataentry'
 * @param {string} opts.newStatus
 * @param {string} opts.userId       - actor user id
 * @param {string} [opts.notes]
 */
export async function applyStatusChange({ lead, leadType, newStatus, userId, notes = '' }) {
  await connectDB();

  const previousStatus = lead.status;
  const leadId = lead._id;

  lead.status = newStatus;

  // Lock logic: first transition into a lock-on status
  if (shouldLock(newStatus) && !lead.locked_at) {
    lead.locked_at = new Date();
    if (!lead.owner_user_id) {
      lead.owner_user_id = userId;
    }
  }

  // Release lock on lock-off statuses
  if (LOCK_OFF_STATUSES.includes(newStatus)) {
    lead.locked_at = null;
  }

  // Write status history
  await LeadStatusHistory.create({
    lead_id: leadId,
    lead_type: leadType,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: userId,
    changed_at: new Date(),
    notes,
  });

  // Write timeline event
  await LeadTimeline.create({
    lead_id: leadId,
    lead_type: leadType,
    event_type: 'status_changed',
    event_data: { from: previousStatus, to: newStatus, notes },
    created_by: userId,
  });

  // If this is the first lock, also emit lead_locked event
  if (shouldLock(newStatus) && previousStatus === 'new') {
    await LeadTimeline.create({
      lead_id: leadId,
      lead_type: leadType,
      event_type: 'lead_locked',
      event_data: { owner: userId },
      created_by: userId,
    });
    await writeAudit({
      event_type: 'lead.locked',
      entity_type: `lead_${leadType}`,
      entity_id: leadId,
      actor_user_id: userId,
      metadata: { status: newStatus },
    });
  }

  await writeAudit({
    event_type: 'lead.status_changed',
    entity_type: `lead_${leadType}`,
    entity_id: leadId,
    actor_user_id: userId,
    metadata: { from: previousStatus, to: newStatus },
  });
}
