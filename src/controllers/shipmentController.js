const asyncHandler = require('express-async-handler');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const { SHIPMENT_STATUSES } = require('../models/Shipment');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipments   [admin]
// Create a shipment for a confirmed order and mark the order as 'shipped'.
// ─────────────────────────────────────────────────────────────────────────────
const createShipment = asyncHandler(async (req, res) => {
  const { orderId, courierId, awbNumber, estimatedDelivery, notes } = req.body;

  if (!orderId || !courierId) {
    res.status(400);
    throw new Error('orderId and courierId are required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status !== 'confirmed') {
    res.status(400);
    throw new Error(`Shipment can only be created for confirmed orders. Current status: ${order.status}`);
  }

  // Prevent duplicate shipments
  const existing = await Shipment.findOne({ order: orderId });
  if (existing) {
    res.status(400);
    throw new Error('A shipment already exists for this order');
  }

  const shipment = await Shipment.create({
    order:           orderId,
    courierPartner:  courierId,
    awbNumber,
    estimatedDelivery,
    notes,
    status:          'label_created',
    trackingEvents:  [
      {
        status:      'label_created',
        description: 'Shipment label created',
        timestamp:   new Date(),
        updatedBy:   req.user._id,
      },
    ],
  });

  // Move order to 'shipped' and link the shipment
  order.status   = 'shipped';
  order.shipment = shipment._id;
  await order.save();

  await shipment.populate([
    { path: 'courierPartner', select: 'name phone email' },
    { path: 'trackingEvents.updatedBy', select: 'name' },
  ]);

  res.status(201).json(shipment);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipments/:id/track   [admin]
// Add a new tracking event to an existing shipment.
// ─────────────────────────────────────────────────────────────────────────────
const addTrackingEvent = asyncHandler(async (req, res) => {
  const { status, location, description } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('status is required');
  }

  if (!SHIPMENT_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Allowed values: ${SHIPMENT_STATUSES.join(', ')}`);
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  shipment.trackingEvents.push({
    status,
    location:    location    || '',
    description: description || '',
    updatedBy:   req.user._id,
    timestamp:   new Date(),
  });

  shipment.status = status;

  // Auto-update order to 'delivered' when shipment is marked delivered
  if (status === 'delivered') {
    shipment.deliveredAt = new Date();
    await Order.findByIdAndUpdate(shipment.order, { status: 'delivered' });
  }

  await shipment.save();

  await shipment.populate([
    { path: 'courierPartner', select: 'name phone' },
    { path: 'trackingEvents.updatedBy', select: 'name' },
  ]);

  res.json(shipment);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments/track/:orderId   [customer]
// Customer tracks their own order's shipment.
// ─────────────────────────────────────────────────────────────────────────────
const trackByOrder = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ order: req.params.orderId })
    .populate('courierPartner', 'name phone email')
    .populate('trackingEvents.updatedBy', 'name');

  if (!shipment) {
    res.status(404);
    throw new Error('No shipment found for this order yet');
  }

  res.json(shipment);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments/awb/:awbNumber   [public]
// Anyone can track a shipment by AWB (waybill) number.
// ─────────────────────────────────────────────────────────────────────────────
const trackByAwb = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ awbNumber: req.params.awbNumber })
    .populate('courierPartner', 'name phone');

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found. Please check the AWB number.');
  }

  // Return limited info for public route (no order details)
  res.json({
    awbNumber:         shipment.awbNumber,
    status:            shipment.status,
    courierPartner:    shipment.courierPartner,
    estimatedDelivery: shipment.estimatedDelivery,
    deliveredAt:       shipment.deliveredAt,
    trackingEvents:    shipment.trackingEvents.map((e) => ({
      status:      e.status,
      location:    e.location,
      description: e.description,
      timestamp:   e.timestamp,
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments   [admin]
// List all shipments with optional status filter.
// ─────────────────────────────────────────────────────────────────────────────
const getAllShipments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const shipments = await Shipment.find(filter)
    .sort({ createdAt: -1 })
    .populate('order', 'orderNumber total status address')
    .populate('courierPartner', 'name phone');

  res.json(shipments);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments/:id   [admin]
// Get single shipment by Mongo ID.
// ─────────────────────────────────────────────────────────────────────────────
const getShipmentById = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('order', 'orderNumber total status address user')
    .populate('courierPartner', 'name phone email')
    .populate('trackingEvents.updatedBy', 'name');

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  res.json(shipment);
});

module.exports = {
  createShipment,
  addTrackingEvent,
  trackByOrder,
  trackByAwb,
  getAllShipments,
  getShipmentById,
};
