import mongoose from 'mongoose';

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    name: { type: String, required: true, trim: true },
    docType: {
      type: String,
      enum: ['cnic', 'contract', 'education', 'experience', 'photo', 'offer_letter', 'nda', 'other'],
      default: 'other',
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true }, // relative path under uploads/hr/
    mimeType: { type: String },
    fileSize: { type: Number }, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') delete mongoose.models.EmployeeDocument;
export default mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
