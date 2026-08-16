const mongoose = require('mongoose');

const SHIPMENT_STATUSES = [
  'label_created',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned',
];

// Each tracking update is recorded as an event in an array
const trackingEventSchema = new mongoose.Schema(
  {
    status:      { type: String, required: true },   // e.g. "in_transit"
    location:    { type: String, default: '' },      // e.g. "Ahmedabad Hub"
    description: { type: String, default: '' },      // human-readable note
    timestamp:   { type: Date, default: Date.now },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin who added this event
  },
  { _id: true }
);

const shipmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // one shipment per order
    },
    courierPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourierPartner',
      required: true,
    },
    awbNumber:         { type: String, trim: true },   // Air Waybill / tracking number
    status:            { type: String, enum: SHIPMENT_STATUSES, default: 'label_created' },
    estimatedDelivery: { type: Date },
    trackingEvents:    [trackingEventSchema],
    deliveredAt:       { type: Date },
    notes:             { type: String, default: '' },

    // ── Delhivery-specific fields ────────────────────────────────────────────
    // Populated automatically when courier partner has isDelhivery = true
    delhiveryShipmentId: { type: String, default: '' }, // Delhivery's internal refnum
    labelUrl:            { type: String, default: '' }, // Shipping label PDF URL
    isServiceable:       { type: Boolean },             // Was delivery pincode serviceable?
  },
  { timestamps: true }
);

shipmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Shipment', shipmentSchema);
module.exports.SHIPMENT_STATUSES = SHIPMENT_STATUSES;
