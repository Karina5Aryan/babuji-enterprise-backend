const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/me', getProfile);
router.put('/me', updateProfile);

router.get('/me/addresses', getAddresses);
router.post('/me/addresses', addAddress);
router.put('/me/addresses/:addressId', updateAddress);
router.delete('/me/addresses/:addressId', deleteAddress);

module.exports = router;
