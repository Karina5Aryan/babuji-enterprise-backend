const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { handleWebhook, checkServiceability } = require('../controllers/delhiveryWebhookController');

// ── Public: Delhivery webhook (NO JWT auth — Delhivery's servers POST here) ──
// Delhivery sends live tracking updates to this endpoint.
// Security is handled by verifying the custom secret header inside the handler.
router.post('/webhook', handleWebhook);

// ── Protected: Check pincode serviceability ──────────────────────────────────
// Both admin and logged-in customers can call this to verify delivery coverage.
// Example: GET /api/delhivery/serviceable/400001
router.get('/serviceable/:pincode', protect, checkServiceability);

module.exports = router;
