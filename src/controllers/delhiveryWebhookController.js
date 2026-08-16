// ─────────────────────────────────────────────────────────────────────────────
// delhiveryWebhookController.js
//
// Handles real-time push notifications from Delhivery.
// Delhivery POSTs to POST /api/delhivery/webhook whenever a shipment status changes.
//
// Security: Validates a custom header secret set in Delhivery merchant portal.
// ─────────────────────────────────────────────────────────────────────────────

const asyncHandler      = require('express-async-handler');
const Shipment          = require('../models/Shipment');
const Order             = require('../models/Order');
const { mapDelhiveryStatus } = require('../utils/delhivery');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/delhivery/webhook   [Public — verified by secret header]
//
// Delhivery sends a JSON payload with tracking updates.
// We respond with 200 immediately and process synchronously.
// ─────────────────────────────────────────────────────────────────────────────
const handleWebhook = asyncHandler(async (req, res) => {
  // ── 1. Verify webhook secret ───────────────────────────────────────────────
  const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret !== 'your_delhivery_webhook_secret_here') {
    // Delhivery sends the secret as a custom header — key varies by account config
    // Common header names: 'x-delhivery-token', 'x-webhook-token', or custom
    const incomingSecret =
      req.headers['x-delhivery-token'] ||
      req.headers['x-webhook-token']   ||
      req.headers['x-secret']          ||
      '';

    if (incomingSecret !== webhookSecret) {
      console.warn('[delhivery-webhook] Invalid secret — request rejected');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const payload = req.body;

  // ── 2. Parse Delhivery webhook payload ────────────────────────────────────
  // Delhivery can send either a single object or an array of shipment updates.
  const shipmentUpdates = Array.isArray(payload) ? payload : [payload];

  let processed = 0;
  let skipped   = 0;

  for (const update of shipmentUpdates) {
    try {
      // Delhivery payload shape may vary; common fields:
      const awb         = update.waybill    || update.AWB     || update.awb         || '';
      const rawStatus   = update.status     || update.Status  || update.scan_type   || '';
      const location    = update.city       || update.City    || update.location     || '';
      const description = update.remark     || update.Remark  || rawStatus;
      const timestamp   = update.timestamp  || update.updated_on || new Date().toISOString();

      if (!awb) {
        console.warn('[delhivery-webhook] No AWB in update — skipping');
        skipped++;
        continue;
      }

      // ── 3. Find matching shipment ──────────────────────────────────────────
      const shipment = await Shipment.findOne({ awbNumber: awb });
      if (!shipment) {
        console.warn(`[delhivery-webhook] No shipment found for AWB: ${awb}`);
        skipped++;
        continue;
      }

      // ── 4. Map Delhivery status → our status ──────────────────────────────
      const mappedStatus = mapDelhiveryStatus(rawStatus);

      // ── 5. Avoid duplicate events ──────────────────────────────────────────
      const eventTime = new Date(timestamp);
      const duplicate = shipment.trackingEvents.some(
        (e) => Math.abs(e.timestamp.getTime() - eventTime.getTime()) < 1000 // within 1 second
      );
      if (duplicate) {
        skipped++;
        continue;
      }

      // ── 6. Push new tracking event ─────────────────────────────────────────
      shipment.trackingEvents.push({
        status:      mappedStatus || shipment.status,
        location:    location     || '',
        description: description  || rawStatus,
        timestamp:   eventTime,
        // updatedBy is not set for webhook events (Delhivery, not an admin)
      });

      if (mappedStatus) {
        shipment.status = mappedStatus;
      }

      // ── 7. Auto-complete order on delivery ────────────────────────────────
      if (mappedStatus === 'delivered' && !shipment.deliveredAt) {
        shipment.deliveredAt = new Date();
        await Order.findByIdAndUpdate(shipment.order, { status: 'delivered' });
        console.log(`[delhivery-webhook] Order marked delivered for AWB: ${awb}`);
      }

      await shipment.save();
      processed++;
      console.log(`[delhivery-webhook] AWB ${awb}: ${rawStatus} → ${mappedStatus || 'unchanged'} (${location})`);

    } catch (err) {
      console.error('[delhivery-webhook] Error processing update:', err.message);
      skipped++;
    }
  }

  // Always return 200 quickly — Delhivery retries if no response within timeout
  res.json({
    received:  true,
    processed,
    skipped,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/delhivery/serviceable/:pincode   [Protected — admin or customer]
// Delegates to shipmentController.checkServiceability.
// Kept here as an alternate convenience route on /api/delhivery/* namespace.
// ─────────────────────────────────────────────────────────────────────────────
const { checkServiceability } = require('./shipmentController');

module.exports = { handleWebhook, checkServiceability };
