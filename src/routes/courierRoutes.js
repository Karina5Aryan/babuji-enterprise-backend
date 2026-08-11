const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  listCouriers,
  getCourier,
  createCourier,
  updateCourier,
  deleteCourier,
} = require('../controllers/courierController');

router.get('/',       protect, listCouriers);           // customer + admin
router.get('/:id',    protect, getCourier);             // customer + admin

router.post('/',      protect, admin, createCourier);   // admin only
router.put('/:id',    protect, admin, updateCourier);   // admin only
router.delete('/:id', protect, admin, deleteCourier);   // admin only (soft delete)

module.exports = router;
