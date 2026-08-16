const express = require('express');
const router  = express.Router();
const {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, admin }  = require('../middleware/auth');
const { uploadImages }    = require('../middleware/upload');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',            getProducts);
router.get('/categories',  getCategories);
router.get('/:id',         getProductById);

// ── Admin  (multipart/form-data with optional images[] field) ─────────────────
router.post('/',    protect, admin, uploadImages, createProduct);
router.put('/:id',  protect, admin, uploadImages, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;
