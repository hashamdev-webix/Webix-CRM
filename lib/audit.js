import connectDB from '@/lib/mongodb';
import AuditEvent from '@/models/AuditEvent';

/**
 * Write an immutable audit event.
 * This should be called inside the same operation as the action being audited,
 * but since MongoDB multi-doc transactions require a replica set, we write
 * audit events as a best-effort secondary write (fire-and-forget-safe).
 *
 * @param {object} params
 * @param {string} params.event_type  - e.g. 'lead.created'
 * @param {string} params.entity_type - e.g. 'lead_social'
 * @param {string} params.entity_id   - MongoDB ObjectId as string
 * @param {string} params.actor_user_id
 * @param {object} [params.metadata]
 */
export async function writeAudit({ event_type, entity_type, entity_id, actor_user_id, metadata = {} }) {
  try {
    await connectDB();
    await AuditEvent.create({
      event_type,
      entity_type,
      entity_id: entity_id?.toString(),
      actor_user_id,
      metadata,
    });
  } catch (err) {
    // Audit failures must NEVER break the primary action
    console.error('[Audit] Failed to write audit event:', event_type, err?.message);
  }
}
