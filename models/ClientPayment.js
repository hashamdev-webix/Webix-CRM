import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.ClientPayment;
}

const ClientPaymentSchema = new mongoose.Schema(
  {
    client_id:      { type: ObjectId, ref: 'Client', required: true, index: true },
    payment_date:   { type: Date, required: true },
    amount:         { type: Number, required: true },
    currency:       { type: String, default: 'PKR' },
    method:         { type: String, trim: true, default: '' },
    invoice_number: { type: String, trim: true, default: '' },
    notes:          { type: String, default: '' },
    logged_by:      { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ClientPaymentSchema.index({ client_id: 1, payment_date: -1 });

export default mongoose.models.ClientPayment || mongoose.model('ClientPayment', ClientPaymentSchema);
