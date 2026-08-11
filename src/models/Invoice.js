const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    // INV-1001 for sale invoices, CN-1001 for credit notes
    invoiceNumber: { type: String, required: true, unique: true },

    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

    // 'sale' = normal invoice after payment
    // 'credit_note' = issued when order is cancelled/refunded
    type: { type: String, enum: ['sale', 'credit_note'], default: 'sale' },

    // Snapshot of items at time of invoice generation
    items: { type: Array, required: true },

    subtotal:       { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    tax:            { type: Number, default: 0 },  // GST — for future use
    total:          { type: Number, required: true },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Invoice', invoiceSchema);
