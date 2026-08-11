const express = require('express');

/**
 * Middleware that captures the raw request body as a Buffer before JSON parsing.
 *
 * Razorpay webhook signature verification requires the raw (unparsed) body bytes.
 * This middleware must be applied ONLY to the webhook route — not globally —
 * because it conflicts with express.json() on other routes.
 *
 * Usage:
 *   router.post('/webhook', captureRawBody, razorpayWebhookController);
 */
const rawBodyCollector = express.raw({ type: 'application/json' });

const captureRawBody = (req, res, next) => {
  rawBodyCollector(req, res, (err) => {
    if (err) return next(err);
    // Store raw Buffer for HMAC verification
    req.rawBody = req.body;
    // Also parse it into a plain object for the controller to use
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (parseErr) {
      req.body = {};
    }
    next();
  });
};

module.exports = captureRawBody;
