import mongoose from 'mongoose';

// Static catalog of all known permissions — seeded once
const PermissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    module: { type: String, required: true }, // e.g. 'leads', 'admin', 'outreach'
  },
  { timestamps: true }
);

PermissionSchema.index({ module: 1 });

export default mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
