const mongoose = require('mongoose');

/**
 * A single line-item inside the cart.
 * We store a live ref to the product (not a snapshot) so prices
 * stay current until the user actually places the order.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

/**
 * One cart per user — stored as a persistent document.
 * `buyMode` lets the frontend toggle between retail and wholesale pricing.
 */
const cartSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items:   { type: [cartItemSchema], default: [] },
    buyMode: { type: String, enum: ['normal', 'wholesale'], default: 'normal' },
  },
  { timestamps: true }
);

cartSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Cart', cartSchema);
