const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CourierPartner = require('../models/CourierPartner');
const Invoice = require('../models/Invoice');
const Cart = require('../models/Cart');
const { resolveUnitPrice, calculateShipping, calculateTotalWeight } = require('../utils/pricing');
const { getDistanceKm } = require('../utils/pincodeDistance');

// Lazy-load razorpay to avoid crash if env vars not set at boot
const getRazorpay = () => require('../config/razorpay');

// Lazy-load nextInvoiceNumber to avoid circular dependency at module load
const getNextInvoiceNumber = () => require('./invoiceController').nextInvoiceNumber;

// ─────────────────────────────────────────────────────────────────────────────
// Generate the next ORD-#### number
// ─────────────────────────────────────────────────────────────────────────────
const nextOrderNumber = async () => {
  const last = await Order.findOne().sort({ createdAt: -1 }).select('orderNumber').lean();
  let n = 1000;
  if (last?.orderNumber) {
    const parsed = parseInt(String(last.orderNumber).replace(/\D/g, ''), 10);
    if (!isNaN(parsed)) n = parsed;
  }
  return `ORD-${n + 1}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolve an order document from either its ORD-#### number or its Mongo _id
// ─────────────────────────────────────────────────────────────────────────────
const findOrder = async (idParam) => {
  let order = await Order.findOne({ orderNumber: idParam });
  if (!order && /^[0-9a-fA-F]{24}$/.test(idParam)) {
    order = await Order.findById(idParam);
  }
  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Place a new order
// @route  POST /api/orders
// @access Private (customer)
// ─────────────────────────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    buyMode = 'normal',
    addressId,
    address,
    courierId,          // optional courier partner selection
    paymentMethod = 'razorpay',
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  // ── Resolve delivery address ────────────────────────────────────────────
  let deliveryAddress = address;
  if (!deliveryAddress && addressId) {
    const saved = req.user.addresses.id(addressId);
    if (!saved) { res.status(400); throw new Error('Selected address not found'); }
    deliveryAddress = saved.toObject();
  }
  if (!deliveryAddress) {
    const def = req.user.addresses.find((a) => a.isDefault) || req.user.addresses[0];
    if (def) deliveryAddress = def.toObject();
  }
  if (!deliveryAddress) {
    res.status(400);
    throw new Error('A delivery address is required');
  }

  // ── Resolve courier partner (optional) ─────────────────────────────────
  let courierDoc = null;
  if (courierId) {
    courierDoc = await CourierPartner.findById(courierId);
    if (!courierDoc || !courierDoc.isActive) {
      res.status(400);
      throw new Error('Selected courier partner is not available');
    }
  }

  // ── Build line items from live product data ─────────────────────────────
  let subtotal = 0;
  const orderItems   = [];
  const stockUpdates = [];

  for (const line of items) {
    const product = await Product.findById(line.productId);
    if (!product || !product.isActive) {
      res.status(404);
      throw new Error(`Product not available: ${line.productId}`);
    }

    const quantity = Number(line.quantity);
    if (!quantity || quantity < 1) {
      res.status(400);
      throw new Error(`Invalid quantity for ${product.name}`);
    }
    if (product.stock < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name} (only ${product.stock} left)`);
    }

    const unitPrice = resolveUnitPrice(product, quantity, buyMode);
    subtotal += unitPrice * quantity;

    orderItems.push({
      productId:       product._id,
      name:            product.name,
      price:           product.price,
      wholesalePrice:  product.wholesalePrice,
      unitPrice,
      imageUrl:        product.imageUrl,
      quantity,
      unit:            product.unit,
      minWholesaleQty: product.minWholesaleQty,
      weightKg:        product.weightKg || 1, // snapshot weight at order time
    });
    stockUpdates.push({ product, quantity });
  }

  // ── Calculate shipping (weight + distance) ───────────────────────────
  const warehousePincode = process.env.WAREHOUSE_PINCODE || '';
  const deliveryPincode  = deliveryAddress.pincode || '';
  const distanceKm       = getDistanceKm(warehousePincode, deliveryPincode);
  const totalWeightKg    = calculateTotalWeight(orderItems);
  const shippingCharge   = calculateShipping(subtotal, totalWeightKg, courierDoc, distanceKm);
  const total            = subtotal + shippingCharge;
  console.log(`[createOrder] weight=${totalWeightKg}kg distance=${distanceKm}km shipping=₹${shippingCharge}`);

  // ── Persist order ──────────────────────────────────────────────────────
  const order = await Order.create({
    orderNumber:    await nextOrderNumber(),
    user:           req.user._id,
    items:          orderItems,
    buyMode,
    address:        deliveryAddress,
    subtotal,
    shippingCharge,
    distanceKm,
    total,
    status:         'pending',
    courierPartner: courierDoc?._id || undefined,
    payment: {
      status: 'pending',
      method: paymentMethod,
    },
  });

  // ── Decrement stock after order is persisted ────────────────────────────
  await Promise.all(
    stockUpdates.map(({ product, quantity }) =>
      Product.updateOne({ _id: product._id }, { $inc: { stock: -quantity } })
    )
  );

  res.status(201).json(order);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Current user's orders
// @route  GET /api/orders/my
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('courierPartner', 'name')
    .populate('shipment', 'status awbNumber');
  res.json(orders);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get one order (own order, or any if admin)
// @route  GET /api/orders/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }

  if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  await order.populate([
    { path: 'courierPartner', select: 'name phone' },
    { path: 'shipment', select: 'status awbNumber estimatedDelivery trackingEvents' },
  ]);

  res.json(order);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Cancel own order (only while pending or confirmed)
//         • Restores stock
//         • Initiates Razorpay refund if order was paid
//         • Auto-generates a Credit Note (CN-XXXX)
// @route  PUT /api/orders/:id/cancel
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  if (!['pending', 'confirmed'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order that is already "${order.status}"`);
  }

  // ── Update order ────────────────────────────────────────────────────────
  order.status       = 'cancelled';
  order.cancelledAt  = new Date();
  order.cancelReason = req.body.reason || 'Customer requested cancellation';
  await order.save();

  // ── Restore stock ───────────────────────────────────────────────────────
  await Promise.all(
    order.items.map((it) =>
      Product.updateOne({ _id: it.productId }, { $inc: { stock: it.quantity } })
    )
  );

  // ── Initiate Razorpay refund (if payment was made) ──────────────────────
  if (order.payment?.status === 'paid' && order.payment?.razorpayPaymentId) {
    try {
      const razorpay = getRazorpay();
      const refund   = await razorpay.payments.refund(
        order.payment.razorpayPaymentId,
        {
          amount: Math.round(order.total * 100), // paise
          notes:  {
            reason:      order.cancelReason,
            orderNumber: order.orderNumber,
          },
        }
      );
      order.payment.refundId     = refund.id;
      order.payment.refundStatus = 'initiated';
      order.payment.refundAmount = refund.amount / 100;
      await order.save();
      console.log(`[cancelOrder] Refund initiated: ${refund.id} for order ${order.orderNumber}`);
    } catch (refundErr) {
      // Don't block cancellation if refund API call fails
      console.error('[cancelOrder] Refund initiation failed:', refundErr.message);
    }
  }

  // ── Auto-generate Credit Note ───────────────────────────────────────────
  try {
    const nextInvoiceNumber = getNextInvoiceNumber();
    const creditNoteNum     = await nextInvoiceNumber('CN');
    await Invoice.create({
      invoiceNumber:  creditNoteNum,
      order:          order._id,
      user:           order.user,
      type:           'credit_note',
      items:          order.items,
      subtotal:       order.subtotal,
      shippingCharge: order.shippingCharge,
      total:          order.total,
      issuedAt:       new Date(),
    });
    console.log(`[cancelOrder] Credit note ${creditNoteNum} created for order ${order.orderNumber}`);
  } catch (cnErr) {
    console.error('[cancelOrder] Credit note creation failed:', cnErr.message);
  }

  res.json({
    message:     'Order cancelled successfully',
    orderNumber: order.orderNumber,
    status:      order.status,
    refund:      order.payment?.refundId
      ? { refundId: order.payment.refundId, status: order.payment.refundStatus }
      : null,
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// @desc   Checkout directly from the user's active cart
//         Reads the cart, validates stock, creates the order, then clears cart.
// @route  POST /api/orders/checkout-from-cart
// @access Private (customer)
// ───────────────────────────────────────────────────────────────────────────────
const checkoutFromCart = asyncHandler(async (req, res) => {
  const {
    addressId,
    address,
    courierId,
    paymentMethod = 'razorpay',
  } = req.body;

  // ── Load and validate cart ─────────────────────────────────────────────────────────
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty. Add items before checking out.');
  }

  const buyMode = cart.buyMode;

  // ── Resolve delivery address ────────────────────────────────────────────────────
  let deliveryAddress = address;
  if (!deliveryAddress && addressId) {
    const saved = req.user.addresses.id(addressId);
    if (!saved) { res.status(400); throw new Error('Selected address not found'); }
    deliveryAddress = saved.toObject();
  }
  if (!deliveryAddress) {
    const def = req.user.addresses.find((a) => a.isDefault) || req.user.addresses[0];
    if (def) deliveryAddress = def.toObject();
  }
  if (!deliveryAddress) {
    res.status(400);
    throw new Error('A delivery address is required. Please add one to your profile.');
  }

  // ── Resolve courier partner (optional) ─────────────────────────────────────────────
  let courierDoc = null;
  if (courierId) {
    courierDoc = await CourierPartner.findById(courierId);
    if (!courierDoc || !courierDoc.isActive) {
      res.status(400);
      throw new Error('Selected courier partner is not available');
    }
  }

  // ── Build order items from cart, validate stock ──────────────────────────────────
  let subtotal = 0;
  const orderItems   = [];
  const stockUpdates = [];
  const invalidItems = [];

  for (const cartItem of cart.items) {
    const product = cartItem.product;

    // Guard: product may have been deactivated since being added to cart
    if (!product || !product.isActive) {
      invalidItems.push(cartItem.product?.name || 'Unknown product (removed)');
      continue;
    }

    const quantity = cartItem.quantity;

    if (product.stock < quantity) {
      res.status(400);
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, In cart: ${quantity}. Please update your cart.`
      );
    }

    const unitPrice = resolveUnitPrice(product, quantity, buyMode);
    subtotal += unitPrice * quantity;

    orderItems.push({
      productId:       product._id,
      name:            product.name,
      price:           product.price,
      wholesalePrice:  product.wholesalePrice,
      unitPrice,
      imageUrl:        product.imageUrl,
      quantity,
      unit:            product.unit,
      minWholesaleQty: product.minWholesaleQty,
      weightKg:        product.weightKg || 1,
    });
    stockUpdates.push({ product, quantity });
  }

  // Reject if ALL cart items are now unavailable
  if (orderItems.length === 0) {
    res.status(400);
    throw new Error('None of the items in your cart are available. Please update your cart.');
  }

  // Warn frontend about skipped items (won't block order if some items are valid)
  // We choose to hard-fail here to avoid silent partial orders:
  if (invalidItems.length > 0) {
    res.status(400);
    throw new Error(
      `Some cart items are no longer available: ${invalidItems.join(', ')}. Please remove them from your cart.`
    );
  }

  // ── Calculate shipping (weight + distance) ──────────────────────────────────────────────
  const warehousePincode = process.env.WAREHOUSE_PINCODE || '';
  const deliveryPincode  = deliveryAddress.pincode || '';
  const distanceKm       = getDistanceKm(warehousePincode, deliveryPincode);
  const totalWeightKg    = calculateTotalWeight(orderItems);
  const shippingCharge   = calculateShipping(subtotal, totalWeightKg, courierDoc, distanceKm);
  const total            = subtotal + shippingCharge;
  console.log(`[checkoutFromCart] weight=${totalWeightKg}kg distance=${distanceKm}km shipping=₹${shippingCharge}`);

  // ── Persist order ──────────────────────────────────────────────────────────────────────
  const order = await Order.create({
    orderNumber:    await nextOrderNumber(),
    user:           req.user._id,
    items:          orderItems,
    buyMode,
    address:        deliveryAddress,
    subtotal,
    shippingCharge,
    distanceKm,
    total,
    status:         'pending',
    courierPartner: courierDoc?._id || undefined,
    payment: {
      status: 'pending',
      method: paymentMethod,
    },
  });

  // ── Decrement stock ────────────────────────────────────────────────────────────────────
  await Promise.all(
    stockUpdates.map(({ product, quantity }) =>
      Product.updateOne({ _id: product._id }, { $inc: { stock: -quantity } })
    )
  );

  // ── Clear the cart now that order is placed ───────────────────────────────────────
  cart.items = [];
  await cart.save();

  res.status(201).json(order);
});

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder, checkoutFromCart, findOrder };
