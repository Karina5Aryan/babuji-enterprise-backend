const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Order = require('../models/Order');
const { findOrder } = require('./orderController');

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Customer places order first (POST /api/orders), then calls this
//          endpoint to get a Razorpay order to open the checkout popup.
//
// @route  POST /api/payments/create-razorpay-order
// @access Private (customer)
// ─────────────────────────────────────────────────────────────────────────────
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error('orderId is required');
  }

  const order = await findOrder(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization: only the owner can initiate payment
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to pay for this order');
  }

  // Only pending orders can be paid
  if (order.status !== 'pending') {
    res.status(400);
    throw new Error(`Order is already ${order.status}. Cannot initiate payment.`);
  }

  // Create Razorpay order (amount must be in paise)
  const razorpayOrder = await razorpay.orders.create({
    amount:   Math.round(order.total * 100),
    currency: 'INR',
    receipt:  order.orderNumber,
    notes: {
      orderNumber: order.orderNumber,
      userId:      order.user.toString(),
    },
  });

  // Save Razorpay order ID on our order for later verification
  order.payment.razorpayOrderId = razorpayOrder.id;
  order.payment.status = 'initiated';
  await order.save();

  res.json({
    razorpayOrderId: razorpayOrder.id,
    amount:          razorpayOrder.amount,
    currency:        razorpayOrder.currency,
    keyId:           process.env.RAZORPAY_KEY_ID,
    orderNumber:     order.orderNumber,
    name:            'Babuji Enterprise',
    description:     `Payment for order ${order.orderNumber}`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — After the Razorpay Checkout popup succeeds on the frontend,
//          the frontend sends the 3 ids to this endpoint to verify the signature.
//
// @route  POST /api/payments/verify
// @access Private (customer)
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    res.status(400);
    throw new Error('razorpay_order_id, razorpay_payment_id, razorpay_signature, and orderId are required');
  }

  // HMAC-SHA256 signature check — Razorpay signs (orderId + "|" + paymentId)
  const body             = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment signature verification failed. Possible fraud.');
  }

  const order = await findOrder(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Mark as paid and confirm
  order.payment.status            = 'paid';
  order.payment.razorpayPaymentId = razorpay_payment_id;
  order.payment.razorpaySignature = razorpay_signature;
  order.payment.paidAt            = new Date();
  order.status                    = 'confirmed';
  await order.save();

  res.json({
    success:     true,
    message:     'Payment verified successfully. Order is confirmed.',
    orderNumber: order.orderNumber,
    status:      order.status,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 (server-side backup) — Razorpay calls this webhook for key events:
//   payment.captured, payment.failed, refund.created, refund.processed
//
// @route  POST /api/payments/webhook
// @access Public (but Razorpay signature verified)
// ─────────────────────────────────────────────────────────────────────────────
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature    = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification');
  } else {
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const event          = req.body;
  const paymentEntity  = event?.payload?.payment?.entity;
  const refundEntity   = event?.payload?.refund?.entity;

  switch (event.event) {
    case 'payment.captured': {
      const order = await Order.findOne({
        'payment.razorpayOrderId': paymentEntity?.order_id,
      });
      if (order && order.payment.status !== 'paid') {
        order.payment.status            = 'paid';
        order.payment.razorpayPaymentId = paymentEntity.id;
        order.payment.paidAt            = new Date();
        order.status                    = 'confirmed';
        await order.save();
        console.log(`[webhook] payment.captured → Order ${order.orderNumber} confirmed`);
      }
      break;
    }

    case 'payment.failed': {
      const order = await Order.findOne({
        'payment.razorpayOrderId': paymentEntity?.order_id,
      });
      if (order) {
        order.payment.status        = 'failed';
        order.payment.failureReason = paymentEntity?.error_description || 'Payment failed';
        await order.save();
        console.log(`[webhook] payment.failed → Order ${order.orderNumber}`);
      }
      break;
    }

    case 'refund.created': {
      const order = await Order.findOne({
        'payment.razorpayPaymentId': refundEntity?.payment_id,
      });
      if (order) {
        order.payment.refundId     = refundEntity.id;
        order.payment.refundStatus = 'initiated';
        order.payment.refundAmount = refundEntity.amount / 100; // paise → ₹
        await order.save();
        console.log(`[webhook] refund.created → Order ${order.orderNumber}, refund ${refundEntity.id}`);
      }
      break;
    }

    case 'refund.processed': {
      const order = await Order.findOne({
        'payment.razorpayPaymentId': refundEntity?.payment_id,
      });
      if (order) {
        order.payment.refundStatus = 'processed';
        order.payment.status       = 'refunded';
        order.status               = 'refunded';
        await order.save();
        console.log(`[webhook] refund.processed → Order ${order.orderNumber}`);
      }
      break;
    }

    default:
      // Acknowledge silently for events we don't handle
      break;
  }

  // Always respond 200 quickly — Razorpay retries if no response within 5 s
  res.json({ received: true });
});

module.exports = { createRazorpayOrder, verifyPayment, razorpayWebhook };
