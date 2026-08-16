const mongoose = require('mongoose');

const courierPartnerSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },   // e.g. "BlueDart"
    contactPerson: { type: String, trim: true },
    phone:         { type: String, trim: true },
    email:         { type: String, trim: true, lowercase: true },

    // Delivery charge rules for this partner
    baseCharge:     { type: Number, default: 40 },   // ₹ base charge
    perKgCharge:    { type: Number, default: 10 },   // ₹ per extra kg above freeWeightKg
    perKmCharge:    { type: Number, default: 2  },   // ₹ per km of delivery distance
    freeWeightKg:   { type: Number, default: 5 },    // first N kg are covered in baseCharge

    // Pincodes this courier serves (empty = serves all)
    servicePincodes: [{ type: String }],

    // Set to true to enable automatic Delhivery API integration.
    // When true, creating a shipment will auto-call Delhivery to manifest
    // the order and retrieve an AWB — no manual entry required.
    isDelhivery: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    notes:    { type: String, default: '' },
  },
  { timestamps: true }
);

courierPartnerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('CourierPartner', courierPartnerSchema);
