const asyncHandler = require('express-async-handler');

// @desc   Get own profile
// @route  GET /api/users/me
// @access Private
const getProfile = asyncHandler(async (req, res) => {
  res.json(req.user.toJSON());
});

// @desc   Update own profile (name, phone)
// @route  PUT /api/users/me
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json(req.user.toJSON());
});

// @desc   List addresses
// @route  GET /api/users/me/addresses
// @access Private
const getAddresses = asyncHandler(async (req, res) => {
  res.json(req.user.toJSON().addresses || []);
});

// @desc   Add an address
// @route  POST /api/users/me/addresses
// @access Private
const addAddress = asyncHandler(async (req, res) => {
  const { name, phone, line1, city, state, pincode, isDefault } = req.body;
  if (!name || !phone || !line1 || !city || !pincode) {
    res.status(400);
    throw new Error('name, phone, line1, city and pincode are required');
  }

  // If this is the first address or marked default, make it the only default
  const makeDefault = isDefault || req.user.addresses.length === 0;
  if (makeDefault) req.user.addresses.forEach((a) => (a.isDefault = false));

  req.user.addresses.push({ name, phone, line1, city, state, pincode, isDefault: makeDefault });
  await req.user.save();
  res.status(201).json(req.user.toJSON().addresses);
});

// @desc   Update an address
// @route  PUT /api/users/me/addresses/:addressId
// @access Private
const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  const fields = ['name', 'phone', 'line1', 'city', 'state', 'pincode'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) address[f] = req.body[f];
  });

  if (req.body.isDefault === true) {
    req.user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
  }

  await req.user.save();
  res.json(req.user.toJSON().addresses);
});

// @desc   Delete an address
// @route  DELETE /api/users/me/addresses/:addressId
// @access Private
const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }
  const wasDefault = address.isDefault;
  address.deleteOne();

  // Promote another address to default if we removed the default one
  if (wasDefault && req.user.addresses.length > 0) {
    req.user.addresses[0].isDefault = true;
  }

  await req.user.save();
  res.json(req.user.toJSON().addresses);
});

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
};
