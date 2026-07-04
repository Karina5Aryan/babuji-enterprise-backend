const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const { ORDER_STATUSES } = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { findOrder } = require('./orderController');

// @desc   Admin dashboard summary
// @route  GET /api/admin/dashboard
// @access Admin
const getDashboard = asyncHandler(async (req, res) => {
  const [totalOrders, totalProducts, totalCustomers, revenueAgg, statusAgg, recentOrders, lowStock] =
    await Promise.all([
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'user' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
      Product.find({ isActive: true, stock: { $lt: 50 } }).sort({ stock: 1 }).limit(10),
    ]);

  const ordersByStatus = ORDER_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  statusAgg.forEach((row) => {
    ordersByStatus[row._id] = row.count;
  });

  res.json({
    totalOrders,
    totalProducts,
    totalCustomers,
    totalRevenue: revenueAgg[0]?.total || 0,
    ordersByStatus,
    recentOrders,
    lowStockProducts: lowStock,
  });
});

// @desc   List all orders (filter: ?status= &search= )
// @route  GET /api/admin/orders
// @access Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email phone');
  res.json(orders);
});

// @desc   Update order status
// @route  PUT /api/admin/orders/:id/status
// @access Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}`);
  }

  const order = await findOrder(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status;
  await order.save();
  res.json(order);
});

// @desc   List customers with order stats
// @route  GET /api/admin/customers
// @access Admin
const getCustomers = asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'user' }).sort({ createdAt: -1 }).lean();

  // Attach order count & spend per customer
  const stats = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
  ]);
  const statMap = stats.reduce((m, s) => {
    m[s._id.toString()] = s;
    return m;
  }, {});

  const result = customers.map((c) => {
    const s = statMap[c._id.toString()] || { orders: 0, totalSpent: 0 };
    return {
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      addresses: c.addresses,
      orders: s.orders,
      totalSpent: s.totalSpent,
      createdAt: c.createdAt,
    };
  });

  res.json(result);
});

module.exports = { getDashboard, getAllOrders, updateOrderStatus, getCustomers };
