import mongoose from 'mongoose';

const EVENT_TYPES = [
  'lead_created', 'status_changed', 'remark_added',
  'email_sent', 'email_reply_logged',
  'call_logged', 'follow_up_created', 'follow_up_completed',
  'lead_locked', 'lead_reassigned', 'outreach_started',
];

const LeadTimelineSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead_type: { type: String, enum: ['social', 'dataentry'], required: true },
    event_type: { type: String, enum: EVENT_TYPES, required: true },
    // Flexible JSON payload per event type
    event_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LeadTimelineSchema.index({ lead_id: 1, lead_type: 1, createdAt: -1 });

export default mongoose.models.LeadTimeline || mongoose.model('LeadTimeline', LeadTimelineSchema);
