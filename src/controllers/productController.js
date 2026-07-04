const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { PRODUCT_CATEGORIES } = require('../models/Product');

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
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
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
  // Merge known categories with any custom ones in the DB
  const all = Array.from(new Set([...PRODUCT_CATEGORIES, ...used]));
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

// @desc   Create product
// @route  POST /api/products
// @access Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// @desc   Update product
// @route  PUT /api/products/:id
// @access Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
});

// @desc   Delete product (soft delete by default, hard delete with ?hard=true)
// @route  DELETE /api/products/:id
// @access Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (req.query.hard === 'true') {
    await product.deleteOne();
  } else {
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
