const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { PRODUCT_CATEGORIES } = require('../models/Product');
const { normaliseFiles, deleteFile } = require('../middleware/upload');

// @desc   List products (supports ?category= & ?search= & ?inStock=)
// @route  GET /api/products
// @access Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, inStock } = req.query;
  const filter = { isActive: true };

  if (category && category !== 'All') filter.category = category;
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category:    { $regex: search, $options: 'i' } },
    ];
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});

// @desc   Distinct list of categories
// @route  GET /api/products/categories
// @access Public
const getCategories = asyncHandler(async (req, res) => {
  const used = await Product.distinct('category', { isActive: true });
  const all  = Array.from(new Set([...PRODUCT_CATEGORIES, ...used]));
  res.json(all);
});

// @desc   Get a single product
// @route  GET /api/products/:id
// @access Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
});

// @desc   Create product  (multipart/form-data)
// @route  POST /api/products
// @access Admin
//
// Body fields (form-data):
//   name, description, category, price, wholesalePrice,
//   stock, unit, minWholesaleQty, weightKg
// Files:
//   images[]  — up to 5 image files
const createProduct = asyncHandler(async (req, res) => {
  // Uploaded files → normalised [{ url, key }] array
  const uploadedImages = normaliseFiles(req);

  const product = await Product.create({
    ...req.body,
    images: uploadedImages,
  });

  res.status(201).json(product);
});

// @desc   Update product  (multipart/form-data)
// @route  PUT /api/products/:id
// @access Admin
//
// Optional body fields:
//   name, description, category, price, wholesalePrice,
//   stock, unit, minWholesaleQty, weightKg,
//   removeImages  — JSON array of keys to delete, e.g. '["products/abc.jpg"]'
// Optional files:
//   images[]  — new files to ADD to the existing images array
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // ── 1. Delete images that the frontend marked for removal ─────────────────
  let currentImages = [...product.images];

  if (req.body.removeImages) {
    let keysToRemove = [];
    try {
      keysToRemove = JSON.parse(req.body.removeImages); // expect JSON array of keys
    } catch {
      res.status(400);
      throw new Error('removeImages must be a valid JSON array of keys');
    }

    // Delete files from storage
    await Promise.all(keysToRemove.map((key) => deleteFile(key)));

    // Remove from current list
    currentImages = currentImages.filter((img) => !keysToRemove.includes(img.key));
  }

  // ── 2. Append newly uploaded images ───────────────────────────────────────
  const newImages = normaliseFiles(req);
  const mergedImages = [...currentImages, ...newImages];

  // ── 3. Build update payload (only include fields that were sent) ───────────
  const {
    name, description, category, price, wholesalePrice,
    stock, unit, minWholesaleQty, weightKg, isActive,
  } = req.body;

  const updates = { images: mergedImages };
  if (name            !== undefined) updates.name            = name;
  if (description     !== undefined) updates.description     = description;
  if (category        !== undefined) updates.category        = category;
  if (price           !== undefined) updates.price           = price;
  if (wholesalePrice  !== undefined) updates.wholesalePrice  = wholesalePrice;
  if (stock           !== undefined) updates.stock           = stock;
  if (unit            !== undefined) updates.unit            = unit;
  if (minWholesaleQty !== undefined) updates.minWholesaleQty = minWholesaleQty;
  if (weightKg        !== undefined) updates.weightKg        = weightKg;
  if (isActive        !== undefined) updates.isActive        = isActive;

  const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.json(updated);
});

// @desc   Delete product (soft by default; hard with ?hard=true)
// @route  DELETE /api/products/:id
// @access Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (req.query.hard === 'true') {
    // Hard delete — also remove all images from storage
    await Promise.all(product.images.map((img) => deleteFile(img.key)));
    await product.deleteOne();
  } else {
    // Soft delete — just deactivate
    product.isActive = false;
    await product.save();
  }

  res.json({ message: 'Product removed' });
});

module.exports = {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
