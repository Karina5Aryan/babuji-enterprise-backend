const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAllOrders,
  updateOrderStatus,
  getCustomers,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.use(protect, admin); // everything here is admin-only

router.get('/dashboard', getDashboard);
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/customers', getCustomers);

module.exports = router;
