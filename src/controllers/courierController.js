const asyncHandler = require('express-async-handler');
const CourierPartner = require('../models/CourierPartner');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/couriers
// Admins see all (including inactive). Customers see only active ones.
// ─────────────────────────────────────────────────────────────────────────────
const listCouriers = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { isActive: true };
  const couriers = await CourierPartner.find(filter).sort({ name: 1 });
  res.json(couriers);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/couriers/:id
// ─────────────────────────────────────────────────────────────────────────────
const getCourier = asyncHandler(async (req, res) => {
  const courier = await CourierPartner.findById(req.params.id);
  if (!courier) {
    res.status(404);
    throw new Error('Courier partner not found');
  }
  res.json(courier);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/couriers   [admin]
// ─────────────────────────────────────────────────────────────────────────────
const createCourier = asyncHandler(async (req, res) => {
  const courier = await CourierPartner.create(req.body);
  res.status(201).json(courier);
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/couriers/:id   [admin]
// ─────────────────────────────────────────────────────────────────────────────
const updateCourier = asyncHandler(async (req, res) => {
  const courier = await CourierPartner.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!courier) {
    res.status(404);
    throw new Error('Courier partner not found');
  }
  res.json(courier);
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/couriers/:id   [admin] — soft delete (sets isActive: false)
// ─────────────────────────────────────────────────────────────────────────────
const deleteCourier = asyncHandler(async (req, res) => {
  const courier = await CourierPartner.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!courier) {
    res.status(404);
    throw new Error('Courier partner not found');
  }
  res.json({ message: 'Courier partner deactivated successfully', courier });
});

module.exports = { listCouriers, getCourier, createCourier, updateCourier, deleteCourier };
