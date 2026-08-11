const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const User = require('../models/User');
const { generateInvoicePdf } = require('../utils/invoicePdf');
const { sendEmail, buildInvoiceEmailHtml } = require('../utils/sendEmail');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate the next sequential invoice number for a given prefix.
// prefix = 'INV' → INV-1001, INV-1002, ...
// prefix = 'CN'  → CN-1001,  CN-1002,  ...
// ─────────────────────────────────────────────────────────────────────────────
const nextInvoiceNumber = async (prefix = 'INV') => {
  const last = await Invoice.findOne({
    invoiceNumber: { $regex: new RegExp(`^${prefix}-`) },
  })
    .sort({ createdAt: -1 })
    .select('invoiceNumber')
    .lean();

  let n = 1000;
  if (last?.invoiceNumber) {
    const parsed = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed)) n = parsed;
  }
  return `${prefix}-${n + 1}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices   [admin or auto-triggered internally]
// Create an invoice for an order. Idempotent — returns existing if found.
// Body: { orderId, type: 'sale' | 'credit_note', sendEmailToCustomer: bool }
// ─────────────────────────────────────────────────────────────────────────────
const createInvoice = asyncHandler(async (req, res) => {
  const { orderId, type = 'sale', sendEmailToCustomer = false } = req.body;

  if (!orderId) {
    res.status(400);
    throw new Error('orderId is required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Idempotent: return existing invoice if already created for this type
  const existing = await Invoice.findOne({ order: orderId, type });
  if (existing) return res.json(existing);

  const prefix        = type === 'credit_note' ? 'CN' : 'INV';
  const invoiceNumber = await nextInvoiceNumber(prefix);

  const invoice = await Invoice.create({
    invoiceNumber,
    order:          order._id,
    user:           order.user,
    type,
    items:          order.items,
    subtotal:       order.subtotal,
    shippingCharge: order.shippingCharge,
    total:          order.total,
    issuedAt:       new Date(),
  });

  // Optionally email the invoice PDF to the customer
  if (sendEmailToCustomer) {
    try {
      const user = await User.findById(order.user);
      if (user?.email) {
        const pdfBuffer = await generateInvoicePdf(invoice, order, user);
        await sendEmail({
          to:        user.email,
          subject:   `Your invoice ${invoiceNumber} — Babuji Enterprise`,
          html:      buildInvoiceEmailHtml(invoiceNumber, order.orderNumber, invoice.total),
          pdfBuffer,
          pdfName:   `${invoiceNumber}.pdf`,
        });
      }
    } catch (emailErr) {
      console.error('[createInvoice] Email send failed:', emailErr.message);
    }
  }

  res.status(201).json(invoice);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id/download   [customer (own) or admin]
// Stream the invoice as a downloadable PDF.
// ─────────────────────────────────────────────────────────────────────────────
const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Authorization: only the owner or an admin can download
  if (
    req.user.role !== 'admin' &&
    invoice.user.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to download this invoice');
  }

  const order = await Order.findById(invoice.order);
  const user  = await User.findById(invoice.user);

  const pdfBuffer = await generateInvoicePdf(invoice, order, user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoice.invoiceNumber}.pdf"`
  );
  res.send(pdfBuffer);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/my   [customer]
// List all invoices for the logged-in customer.
// ─────────────────────────────────────────────────────────────────────────────
const getMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('order', 'orderNumber status total');
  res.json(invoices);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices   [admin]
// List all invoices with optional ?type= and ?search= filters.
// ─────────────────────────────────────────────────────────────────────────────
const getAllInvoices = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const filter = {};
  if (type)   filter.type = type;
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .populate('order', 'orderNumber status total')
    .populate('user', 'name email');
  res.json(invoices);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id   [customer (own) or admin]
// ─────────────────────────────────────────────────────────────────────────────
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('order', 'orderNumber status total address')
    .populate('user', 'name email');
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  if (
    req.user.role !== 'admin' &&
    invoice.user._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json(invoice);
});

module.exports = {
  createInvoice,
  downloadInvoicePdf,
  getMyInvoices,
  getAllInvoices,
  getInvoiceById,
  nextInvoiceNumber, // exported so orderController can use it during auto credit note
};
