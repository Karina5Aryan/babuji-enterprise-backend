const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  createShipment,
  addTrackingEvent,
  trackByOrder,
  trackByAwb,
  getAllShipments,
  getShipmentById,
  checkServiceability,
  syncDelhiveryTracking,
} = require('../controllers/shipmentController');

// ── Public route: track by AWB number (no login required) ──────────────────
router.get('/awb/:awbNumber', trackByAwb);

// ── Customer routes (login required) ───────────────────────────────────────
// Track their own order's shipment
router.get('/track/:orderId',        protect, trackByOrder);
// Check if a delivery pincode is serviceable by Delhivery
router.get('/serviceable/:pincode',  protect, checkServiceability);

// ── Admin routes ────────────────────────────────────────────────────────────
router.get('/',               protect, admin, getAllShipments);
router.get('/:id',            protect, admin, getShipmentById);
router.post('/',              protect, admin, createShipment);
router.post('/:id/track',     protect, admin, addTrackingEvent);
// Manually sync latest tracking status from Delhivery API
router.post('/:id/sync',      protect, admin, syncDelhiveryTracking);

module.exports = router;

