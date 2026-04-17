import mongoose from 'mongoose';

const SalaryHistorySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    previousSalary: { type: Number, default: 0 },
    newSalary: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    reason: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.SalaryHistory;
export default mongoose.models.SalaryHistory || mongoose.model('SalaryHistory', SalaryHistorySchema);
