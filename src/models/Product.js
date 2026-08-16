const mongoose = require('mongoose');

const PRODUCT_CATEGORIES = ['Grains', 'Oils', 'Pulses', 'Sugar & Salt'];

const productSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    description:     { type: String, default: '' },
    category:        { type: String, required: true, trim: true },

    // Array of uploaded images. Each entry has:
    //   url — public URL (local server path or S3 URL)
    //   key — storage key used to delete the file later
    images: {
      type: [
        {
          url: { type: String, required: true },
          key: { type: String, required: true }, // relative path or S3 key
          _id: false,
        },
      ],
      default: [],
    },

    price:           { type: Number, required: true, min: 0 }, // retail price
    wholesalePrice:  { type: Number, required: true, min: 0 },
    stock:           { type: Number, required: true, min: 0, default: 0 },
    unit:            { type: String, default: 'kg' }, // kg, L, unit, etc.
    minWholesaleQty: { type: Number, default: 1, min: 1 },
    weightKg:        { type: Number, default: 1, min: 0 }, // used for delivery charge calc
    isActive:        { type: Boolean, default: true },
  },
  { timestamps: true }
);


productSchema.index({ name: 'text', description: 'text', category: 'text' });

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Product', productSchema);
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
