import mongoose from 'mongoose';

const PayrollRecordSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    // Salary fields (editable at time of payroll run)
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },

    // Attendance
    workingDays: { type: Number, default: 26 },
    presentDays: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },

    // Computed net (stored for records)
    netSalary: { type: Number, default: 0 },

    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalized_at: { type: Date },
  },
  { timestamps: true }
);

// One record per employee per period
PayrollRecordSchema.index({ employee_id: 1, month: 1, year: 1 }, { unique: true });
PayrollRecordSchema.index({ month: 1, year: 1 });

export default mongoose.models.PayrollRecord ||
  mongoose.model('PayrollRecord', PayrollRecordSchema);
