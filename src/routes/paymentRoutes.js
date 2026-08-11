const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const captureRawBody = require('../middleware/razorpayWebhook');
const {
  createRazorpayOrder,
  verifyPayment,
  razorpayWebhook,
} = require('../controllers/paymentController');

// ── Public: Razorpay webhook (raw body required, NO JWT auth) ───────────────
// Razorpay POSTs to this URL from their servers — must not require login.
// The route uses its own raw-body middleware instead of express.json().
router.post('/webhook', captureRawBody, razorpayWebhook);

// ── Authenticated customer routes ───────────────────────────────────────────
// Step 1: get a Razorpay order to open the checkout popup
router.post('/create-razorpay-order', protect, createRazorpayOrder);

// Step 2: verify the payment after checkout popup success
router.post('/verify', protect, verifyPayment);

module.exports = router;
