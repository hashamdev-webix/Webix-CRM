import mongoose from 'mongoose';

// Immutable audit log — no updates or deletes ever
const AuditEventSchema = new mongoose.Schema(
  {
    event_type: { type: String, required: true, index: true },
    // entity_type: lead_social | lead_dataentry | role | user | config | outreach | follow_up
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: String, index: true }, // stored as string for flexibility
    actor_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Flexible JSON payload
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    // Prevent accidental updates to audit records
    strict: true,
  }
);

AuditEventSchema.index({ createdAt: -1 });
AuditEventSchema.index({ event_type: 1, createdAt: -1 });
AuditEventSchema.index({ actor_user_id: 1, createdAt: -1 });

export default mongoose.models.AuditEvent || mongoose.model('AuditEvent', AuditEventSchema);
