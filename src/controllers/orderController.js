const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { resolveUnitPrice, calculateShipping } = require('../utils/pricing');

// Generate the next ORD-#### number
const nextOrderNumber = async () => {
  const last = await Order.findOne().sort({ createdAt: -1 }).select('orderNumber').lean();
  let n = 1000;
  if (last && last.orderNumber) {
    const parsed = parseInt(String(last.orderNumber).replace(/\D/g, ''), 10);
    if (!Number.isNaN(parsed)) n = parsed;
  }
  return `ORD-${n + 1}`;
};

// Resolve an order document from either its ORD-#### number or its Mongo _id
const findOrder = async (idParam) => {
  let order = await Order.findOne({ orderNumber: idParam });
  if (!order && idParam.match(/^[0-9a-fA-F]{24}$/)) {
    order = await Order.findById(idParam);
  }
  return order;
};

// @desc   Place a new order
// @route  POST /api/orders
// @access Private (customer)
const createOrder = asyncHandler(async (req, res) => {
  const { items, buyMode = 'normal', addressId, address } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  // Resolve delivery address: explicit address object, or one of the user's saved addresses
  let deliveryAddress = address;
  if (!deliveryAddress && addressId) {
    const saved = req.user.addresses.id(addressId);
    if (!saved) {
      res.status(400);
      throw new Error('Selected address not found');
    }
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

  // Build line items from live product data (never trust client prices)
  let subtotal = 0;
  const orderItems = [];
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
      productId: product._id,
      name: product.name,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      unitPrice,
      imageUrl: product.imageUrl,
      quantity,
      unit: product.unit,
      minWholesaleQty: product.minWholesaleQty,
    });
    stockUpdates.push({ product, quantity });
  }

  const shippingCharge = calculateShipping(subtotal);
  const total = subtotal + shippingCharge;

  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    user: req.user._id,
    items: orderItems,
    buyMode,
    address: deliveryAddress,
    subtotal,
    shippingCharge,
    total,
    status: 'pending',
  });

  // Decrement stock after the order is persisted
  await Promise.all(
    stockUpdates.map(({ product, quantity }) =>
      Product.updateOne({ _id: product._id }, { $inc: { stock: -quantity } })
    )
  );

  res.status(201).json(order);
});

// @desc   Current user's orders
// @route  GET /api/orders/my
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc   Get one order (own order, or any if admin)
// @route  GET /api/orders/:id
// @access Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }
  res.json(order);
});

// @desc   Cancel own order (only while pending/confirmed)
// @route  PUT /api/orders/:id/cancel
// @access Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }
  if (!['pending', 'confirmed'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order that is ${order.status}`);
  }

  order.status = 'cancelled';
  await order.save();

  // Restore stock
  await Promise.all(
    order.items.map((it) =>
      Product.updateOne({ _id: it.productId }, { $inc: { stock: it.quantity } })
    )
  );

  res.json(order);
});

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder, findOrder };
