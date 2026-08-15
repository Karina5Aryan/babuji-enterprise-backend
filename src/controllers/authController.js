const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

// ─── Helper ───────────────────────────────────────────────────────────────────
// Build the standard auth response — both tokens + user profile.
const authResponse = (user, res, statusCode = 200) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token on the user document (enables revocation on logout)
  user.refreshToken = refreshToken;
  user.save(); // fire-and-forget — don't await to keep response fast

  return res.status(statusCode).json({
    user:         user.toJSON(),
    accessToken,
    refreshToken,
    expiresIn:    process.env.JWT_EXPIRES_IN || '15m',
  });
};

// @desc   Register a new customer
// @route  POST /api/auth/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({ name, email, phone, password, role: 'user' });
  return authResponse(user, res, 201);
});

// @desc   Login (customer or admin)
// @route  POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (role && role !== user.role) {
    res.status(403);
    throw new Error(`This account is not authorized for ${role} login`);
  }

  return authResponse(user, res);
});

// @desc   Silently issue a new access token using a valid refresh token
// @route  POST /api/auth/refresh
// @access Public (refresh token in body)
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error('refreshToken is required');
  }

  // Verify the refresh token signature
  let decoded;
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    decoded = jwt.verify(token, secret);
  } catch {
    res.status(401);
    throw new Error('Invalid or expired refresh token. Please log in again.');
  }

  // Check the token matches what we stored (revocation check)
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error('Refresh token has been revoked. Please log in again.');
  }

  // Issue a fresh access token (rotate refresh token for security)
  return authResponse(user, res);
});

// @desc   Logout — revoke the refresh token
// @route  POST /api/auth/logout
// @access Private
const logout = asyncHandler(async (req, res) => {
  // Clear stored refresh token so it can never be reused
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ message: 'Logged out successfully' });
});

// @desc   Get current logged-in user
// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user.toJSON());
});

module.exports = { register, login, refreshToken, logout, getMe };

