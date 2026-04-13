import mongoose from 'mongoose';

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Company;
}

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
