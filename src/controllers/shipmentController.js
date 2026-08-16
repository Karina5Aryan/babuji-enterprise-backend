const asyncHandler = require('express-async-handler');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const CourierPartner = require('../models/CourierPartner');
const { SHIPMENT_STATUSES } = require('../models/Shipment');
const delhivery = require('../utils/delhivery');

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

  // ── Resolve courier partner ────────────────────────────────────────────────
  const courierDoc = await CourierPartner.findById(courierId);
  if (!courierDoc) {
    res.status(404);
    throw new Error('Courier partner not found');
  }

  // ── Delhivery: auto-create shipment via API ────────────────────────────────
  let finalAwb            = awbNumber || '';
  let delhiveryShipmentId = '';
  let isServiceable       = undefined;

  if (courierDoc.isDelhivery) {
    const deliveryPincode = order.address?.pincode || '';

    // 1. Check serviceability
    try {
      const svc = await delhivery.checkServiceability(deliveryPincode);
      isServiceable = svc.serviceable;
      if (!svc.serviceable) {
        res.status(400);
        throw new Error(`Pincode ${deliveryPincode} is not serviceable by Delhivery`);
      }
      console.log(`[createShipment] Delhivery: pincode ${deliveryPincode} is serviceable`);
    } catch (svcErr) {
      if (res.statusCode === 400) throw svcErr; // already set
      // If serviceability check itself fails (network etc.), warn but continue
      console.warn('[createShipment] Delhivery serviceability check error:', svcErr.message);
    }

    // 2. Manifest the shipment → get AWB
    try {
      const totalWeight = order.items?.reduce(
        (sum, item) => sum + (item.weightKg || 1) * item.quantity, 0
      ) || 0.5;

      const result = await delhivery.createShipment(order, {
        totalWeight,
        totalValue: order.total,
      });

      finalAwb            = result.awb;
      delhiveryShipmentId = result.shipmentId;
      console.log(`[createShipment] Delhivery AWB assigned: ${finalAwb}`);
    } catch (dErr) {
      res.status(502);
      throw new Error(`Delhivery shipment creation failed: ${dErr.message}`);
    }
  }

  // ── Persist shipment ────────────────────────────────────────────────────────
  const shipment = await Shipment.create({
    order:               orderId,
    courierPartner:      courierId,
    awbNumber:           finalAwb,
    estimatedDelivery,
    notes,
    status:              'label_created',
    delhiveryShipmentId,
    isServiceable,
    trackingEvents: [
      {
        status:      'label_created',
        description: courierDoc.isDelhivery
          ? `Shipment manifested via Delhivery. AWB: ${finalAwb}`
          : 'Shipment label created',
        timestamp: new Date(),
        updatedBy: req.user._id,
      },
    ],
  });

  // Move order to 'shipped' and link the shipment
  order.status   = 'shipped';
  order.shipment = shipment._id;
  await order.save();

  await shipment.populate([
    { path: 'courierPartner', select: 'name phone email isDelhivery' },
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipments/serviceable/:pincode   [admin + customer]
// Check whether a pincode is serviceable by Delhivery.
// ─────────────────────────────────────────────────────────────────────────────
const checkServiceability = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  if (!pincode) {
    res.status(400);
    throw new Error('pincode is required');
  }
  const result = await delhivery.checkServiceability(pincode);
  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipments/:id/sync   [admin]
// Manually pull the latest tracking status from Delhivery and sync it to our DB.
// ─────────────────────────────────────────────────────────────────────────────
const syncDelhiveryTracking = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('courierPartner', 'isDelhivery name');

  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  if (!shipment.courierPartner?.isDelhivery) {
    res.status(400);
    throw new Error('This shipment is not managed by Delhivery');
  }

  if (!shipment.awbNumber) {
    res.status(400);
    throw new Error('No AWB number on this shipment — cannot sync');
  }

  const trackData = await delhivery.trackShipment(shipment.awbNumber);

  // Parse the scans array from Delhivery tracking response
  const scans = trackData?.ShipmentData?.[0]?.Shipment?.Scans || [];

  let newEventsAdded = 0;
  for (const scan of scans) {
    const scanDetail   = scan.ScanDetail || {};
    const rawStatus    = scanDetail.Scan || '';
    const location     = scanDetail.ScannedLocation || '';
    const description  = scanDetail.Instructions   || rawStatus;
    const timestamp    = new Date(scanDetail.ScanDateTime || Date.now());
    const mappedStatus = delhivery.mapDelhiveryStatus(rawStatus);

    // Avoid duplicate events by checking timestamp
    const alreadyExists = shipment.trackingEvents.some(
      (e) => e.timestamp.getTime() === timestamp.getTime()
    );
    if (alreadyExists) continue;

    shipment.trackingEvents.push({
      status:      mappedStatus || shipment.status,
      location,
      description,
      timestamp,
    });

    if (mappedStatus) shipment.status = mappedStatus;
    newEventsAdded++;
  }

  // Auto-update order if delivered
  if (shipment.status === 'delivered' && !shipment.deliveredAt) {
    shipment.deliveredAt = new Date();
    await Order.findByIdAndUpdate(shipment.order, { status: 'delivered' });
  }

  await shipment.save();

  res.json({
    message:        `Sync complete. ${newEventsAdded} new event(s) added.`,
    status:         shipment.status,
    newEventsAdded,
    trackingEvents: shipment.trackingEvents,
  });
});

module.exports = {
  createShipment,
  addTrackingEvent,
  trackByOrder,
  trackByAwb,
  getAllShipments,
  getShipmentById,
  checkServiceability,
  syncDelhiveryTracking,
};
