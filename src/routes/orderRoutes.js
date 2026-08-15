const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  checkoutFromCart,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect); // all order routes require auth

router.post('/',                   createOrder);
router.post('/checkout-from-cart', checkoutFromCart); // must be before /:id
router.get('/my',                  getMyOrders);
router.get('/:id',                 getOrderById);
router.put('/:id/cancel',          cancelOrder);

module.exports = router;
