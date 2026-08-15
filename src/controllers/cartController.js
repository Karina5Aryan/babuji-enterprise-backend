const asyncHandler = require('express-async-handler');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Find-or-create the cart for the logged-in user and populate product details.
 */
const findOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await cart.populate('items.product');
  }
  return cart;
};

/**
 * Build a clean summary response — resolves the unit price based on buyMode
 * so the frontend never needs to re-calculate.
 */
const cartResponse = (cart) => {
  const mode = cart.buyMode;

  const items = cart.items
    .filter((i) => i.product) // guard against orphaned refs
    .map((i) => {
      const p        = i.product;
      const unitPrice =
        mode === 'wholesale' && i.quantity >= p.minWholesaleQty
          ? p.wholesalePrice
          : p.price;

      return {
        product:    p,
        quantity:   i.quantity,
        unitPrice,
        lineTotal:  +(unitPrice * i.quantity).toFixed(2),
      };
    });

  const subtotal = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);

  return {
    id:       cart.id,
    buyMode:  mode,
    items,
    subtotal,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    updatedAt: cart.updatedAt,
  };
};

// ─── controllers ────────────────────────────────────────────────────────────

// @desc   Get the current user's cart
// @route  GET /api/cart
// @access Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.user._id);
  res.json(cartResponse(cart));
});

// @desc   Add an item or increase its quantity
// @route  POST /api/cart/add
// @access Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error('productId is required');
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    res.status(400);
    throw new Error('quantity must be a positive integer');
  }

  // Validate product exists and is active
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    res.status(404);
    throw new Error('Product not found or unavailable');
  }

  // Stock check
  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Only ${product.stock} units in stock`);
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user:  req.user._id,
      items: [{ product: productId, quantity: qty }],
    });
  } else {
    const existingIndex = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );

    if (existingIndex >= 0) {
      const newQty = cart.items[existingIndex].quantity + qty;

      // Stock check against combined quantity
      if (product.stock < newQty) {
        res.status(400);
        throw new Error(
          `Cannot add ${qty} more — only ${product.stock - cart.items[existingIndex].quantity} more units available`
        );
      }

      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity: qty });
    }

    await cart.save();
  }

  await cart.populate('items.product');
  res.status(201).json(cartResponse(cart));
});

// @desc   Update quantity of an existing item (set absolute value)
// @route  PUT /api/cart/item/:productId
// @access Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity }  = req.body;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    res.status(400);
    throw new Error('quantity must be a positive integer');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Only ${product.stock} units in stock`);
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (i) => i.product.toString() === productId
  );
  if (itemIndex < 0) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  cart.items[itemIndex].quantity = qty;
  await cart.save();
  await cart.populate('items.product');

  res.json(cartResponse(cart));
});

// @desc   Remove a single item from the cart
// @route  DELETE /api/cart/item/:productId
// @access Private
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);

  if (cart.items.length === before) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  await cart.save();
  await cart.populate('items.product');

  res.json(cartResponse(cart));
});

// @desc   Clear all items from the cart
// @route  DELETE /api/cart
// @access Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  res.json({ message: 'Cart cleared', itemCount: 0 });
});

// @desc   Switch between 'normal' and 'wholesale' buy mode
// @route  PUT /api/cart/mode
// @access Private
const setBuyMode = asyncHandler(async (req, res) => {
  const { buyMode } = req.body;
  if (!['normal', 'wholesale'].includes(buyMode)) {
    res.status(400);
    throw new Error("buyMode must be 'normal' or 'wholesale'");
  }

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { buyMode },
    { new: true, upsert: true }
  ).populate('items.product');

  res.json(cartResponse(cart));
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  setBuyMode,
};
