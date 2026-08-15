const jwt = require('jsonwebtoken');

/**
 * Short-lived access token — sent in Authorization header on every API call.
 * Default: 15 minutes.
 */
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

/**
 * Long-lived refresh token — stored in the User document.
 * Used ONLY to obtain a new access token via POST /api/auth/refresh.
 * Default: 30 days.
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

// Keep old name as alias so nothing else breaks
const generateToken = generateAccessToken;

module.exports = { generateToken, generateAccessToken, generateRefreshToken };
