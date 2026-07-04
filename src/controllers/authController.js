const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'user', // self-registration is always a customer
  });

  res.status(201).json({
    user: user.toJSON(),
    token: generateToken(user._id),
  });
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

  // The login screen has a Customer/Admin toggle. If a role was requested,
  // make sure it matches the account so a customer can't enter via Admin.
  if (role && role !== user.role) {
    res.status(403);
    throw new Error(`This account is not authorized for ${role} login`);
  }

  res.json({
    user: user.toJSON(),
    token: generateToken(user._id),
  });
});

// @desc   Get current logged-in user
// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user.toJSON());
});

module.exports = { register, login, getMe };
