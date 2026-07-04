const mongoose = require('mongoose');

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

// Item snapshot — prices are captured at order time so later product
// edits don't change historical orders.
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // retail price at order time
    wholesalePrice: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // actual price charged per unit
    imageUrl: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'kg' },
    minWholesaleQty: { type: Number, default: 1 },
  },
  { _id: false }
);

// Delivery address snapshot
const addressSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    line1: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // e.g. ORD-1001
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    buyMode: { type: String, enum: ['normal', 'wholesale'], default: 'normal' },
    address: { type: addressSnapshotSchema, required: true },
    subtotal: { type: Number, required: true },
    shippingCharge: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
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
