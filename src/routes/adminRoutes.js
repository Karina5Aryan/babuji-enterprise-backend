const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAllOrders,
  updateOrderStatus,
  getCustomers,
} = require('../controllers/adminController');
const {
  getAllShipments,
  getShipmentById,
  createShipment,
  addTrackingEvent,
} = require('../controllers/shipmentController');
const {
  listCouriers,
  getCourier,
  createCourier,
  updateCourier,
  deleteCourier,
} = require('../controllers/courierController');
const {
  getAllInvoices,
  createInvoice,
} = require('../controllers/invoiceController');
const { protect, admin } = require('../middleware/auth');

// All routes in this file require admin authentication
router.use(protect, admin);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);

// ── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders',              getAllOrders);
router.put('/orders/:id/status',   updateOrderStatus);

// ── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', getCustomers);

// ── Shipments (admin shipment management panel) ──────────────────────────────
router.get('/shipments',               getAllShipments);
router.get('/shipments/:id',           getShipmentById);
router.post('/shipments',              createShipment);
router.post('/shipments/:id/track',    addTrackingEvent);

// ── Courier Partners ──────────────────────────────────────────────────────────
router.get('/couriers',        listCouriers);
router.get('/couriers/:id',    getCourier);
router.post('/couriers',       createCourier);
router.put('/couriers/:id',    updateCourier);
router.delete('/couriers/:id', deleteCourier);

// ── Invoices ──────────────────────────────────────────────────────────────────
router.get('/invoices',  getAllInvoices);
router.post('/invoices', createInvoice);

module.exports = router;
