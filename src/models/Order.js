const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending',          // order placed, awaiting payment
  'confirmed',        // payment received / COD accepted
  'shipped',          // shipment created, in transit
  'delivered',        // delivered to customer
  'cancelled',        // cancelled by customer or admin
  'refunded',         // refund complete
];

// Payment sub-schema
const paymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'initiated', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['razorpay', 'cod', 'upi'],
      default: 'razorpay',
    },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt:            { type: Date },
    failureReason:     { type: String },
    refundId:          { type: String },
    refundStatus: {
      type: String,
      enum: ['initiated', 'processed', 'failed'],
    },
    refundAmount: { type: Number },
  },
  { _id: false }
);

// Item snapshot — prices are captured at order time so later product
// edits don't change historical orders.
const orderItemSchema = new mongoose.Schema(
  {
    productId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:            { type: String, required: true },
    price:           { type: Number, required: true }, // retail price at order time
    wholesalePrice:  { type: Number, required: true },
    unitPrice:       { type: Number, required: true }, // actual price charged per unit
    imageUrl:        { type: String, default: '' },
    quantity:        { type: Number, required: true, min: 1 },
    unit:            { type: String, default: 'kg' },
    minWholesaleQty: { type: Number, default: 1 },
    weightKg:        { type: Number, default: 1 }, // snapshot of weight at order time
  },
  { _id: false }
);

// Delivery address snapshot
const addressSnapshotSchema = new mongoose.Schema(
  {
    name:    String,
    phone:   String,
    line1:   String,
    city:    String,
    state:   String,
    pincode: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber:    { type: String, required: true, unique: true }, // e.g. ORD-1001
    user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items:          { type: [orderItemSchema], required: true },
    buyMode:        { type: String, enum: ['normal', 'wholesale'], default: 'normal' },
    address:        { type: addressSnapshotSchema, required: true },
    subtotal:       { type: Number, required: true },
    shippingCharge: { type: Number, required: true, default: 0 },
    total:          { type: Number, required: true },
    status:         { type: String, enum: ORDER_STATUSES, default: 'pending' },

    // Payment information
    payment: { type: paymentSchema, default: () => ({}) },

    // Cancellation info
    cancelledAt:  { type: Date },
    cancelReason: { type: String },

    // Linked shipment (set when admin creates shipment)
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },

    // Courier partner selected at order time (optional)
    courierPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'CourierPartner' },
  },
  { timestamps: true }
);

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    // Frontend uses the human order number as `id` (e.g. "ORD-1001")
    ret.id = ret.orderNumber;
    ret._mongoId = ret._id;
    delete ret._id;
    ret.userId = ret.user;
    return ret;
  },
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
