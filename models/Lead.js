import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
  {
    platformLeadId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    source: { type: String, enum: ['meta', 'google', 'manual'], default: 'manual' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    service: {
      type: String,
      enum: ['Digital Marketing', 'Graphic Designing', 'Web Development'],
      default: 'Digital Marketing',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'closed'],
      default: 'new',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    notes: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeadSchema.index({ source: 1 });
LeadSchema.index({ receivedAt: -1 });
LeadSchema.index({ status: 1, source: 1 });
LeadSchema.index({ campaignId: 1, status: 1 });
LeadSchema.index({ assignedTo: 1, status: 1 });
LeadSchema.index({ createdAt: -1 });

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
