const express = require('express');
const router  = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  setBuyMode,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes require authentication
router.use(protect);

router.get('/',                     getCart);        // GET  /api/cart
router.post('/add',                 addToCart);      // POST /api/cart/add
router.put('/mode',                 setBuyMode);     // PUT  /api/cart/mode
router.put('/item/:productId',      updateCartItem); // PUT  /api/cart/item/:productId
router.delete('/item/:productId',   removeCartItem); // DELETE /api/cart/item/:productId
router.delete('/',                  clearCart);      // DELETE /api/cart

module.exports = router;
