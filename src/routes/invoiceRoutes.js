const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  createInvoice,
  downloadInvoicePdf,
  getMyInvoices,
  getAllInvoices,
  getInvoiceById,
} = require('../controllers/invoiceController');

// ── Customer routes ──────────────────────────────────────────────────────────
router.get('/my',              protect, getMyInvoices);         // list customer's own invoices
router.get('/:id',             protect, getInvoiceById);        // single invoice (own or admin)
router.get('/:id/download',    protect, downloadInvoicePdf);    // download PDF

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/',                protect, admin, getAllInvoices);  // all invoices
router.post('/',               protect, admin, createInvoice);  // create manually

module.exports = router;
