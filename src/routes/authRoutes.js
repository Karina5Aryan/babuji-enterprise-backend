const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refreshToken);          // public — uses refresh token
router.post('/logout',   protect, logout);       // private — clears refresh token
router.get('/me',        protect, getMe);

module.exports = router;
