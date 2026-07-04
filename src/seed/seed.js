require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { resolveUnitPrice, calculateShipping } = require('../utils/pricing');
const { products, users } = require('./data');

const destroy = process.argv.includes('--destroy');

async function run() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
  console.log('Cleared existing data');

  if (destroy) {
    console.log('Destroy mode — database emptied. Done.');
    await mongoose.disconnect();
    return;
  }

  // Users (password hashing runs via the pre-save hook, so create one by one)
  const createdUsers = [];
  for (const u of users) {
    createdUsers.push(await User.create(u));
  }
  console.log(`Seeded ${createdUsers.length} users`);

  const createdProducts = await Product.insertMany(products);
  console.log(`Seeded ${createdProducts.length} products`);

  // A few sample orders for the customer "Ramesh Patel"
  const ramesh = createdUsers.find((u) => u.email === 'ramesh@example.com');
  const rice = createdProducts.find((p) => p.name.includes('Basmati'));
  const oil = createdProducts.find((p) => p.name.includes('Sunflower'));
  const atta = createdProducts.find((p) => p.name.includes('Atta'));
  const rameshAddr = ramesh.addresses[0].toObject();

  const buildItem = (product, quantity, buyMode) => ({
    productId: product._id,
    name: product.name,
    price: product.price,
    wholesalePrice: product.wholesalePrice,
    unitPrice: resolveUnitPrice(product, quantity, buyMode),
    imageUrl: product.imageUrl,
    quantity,
    unit: product.unit,
    minWholesaleQty: product.minWholesaleQty,
  });

  const buildOrder = (number, items, buyMode, status, daysAgo) => {
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const shippingCharge = calculateShipping(subtotal);
    const created = new Date(Date.now() - daysAgo * 86400000);
    return {
      orderNumber: number,
      user: ramesh._id,
      items,
      buyMode,
      address: rameshAddr,
      subtotal,
      shippingCharge,
      total: subtotal + shippingCharge,
      status,
      createdAt: created,
      updatedAt: created,
    };
  };

  const sampleOrders = [
    buildOrder('ORD-1001', [buildItem(rice, 5, 'normal')], 'normal', 'delivered', 42),
    buildOrder(
      'ORD-1002',
      [buildItem(oil, 2, 'normal'), buildItem(atta, 10, 'normal')],
      'normal',
      'shipped',
      20
    ),
    buildOrder('ORD-1003', [buildItem(rice, 25, 'wholesale')], 'wholesale', 'pending', 2),
  ];

  await Order.insertMany(sampleOrders);
  console.log(`Seeded ${sampleOrders.length} sample orders`);

  console.log('\nDemo accounts (password: password123):');
  console.log('  Admin    -> admin@babujienterprise.com');
  console.log('  Customer -> ramesh@example.com');

  await mongoose.disconnect();
  console.log('\nSeed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
