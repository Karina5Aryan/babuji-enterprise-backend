require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User     = require('../models/User');
const Product  = require('../models/Product');
const Order    = require('../models/Order');
const Invoice  = require('../models/Invoice');
const Shipment = require('../models/Shipment');
const Cart     = require('../models/Cart');
const CourierPartner = require('../models/CourierPartner');

const { resolveUnitPrice, calculateShipping, calculateTotalWeight } = require('../utils/pricing');
const { products, users } = require('./data');

const destroy = process.argv.includes('--destroy');

// ─── helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const buildItem = (product, quantity, buyMode) => ({
  productId:       product._id,
  name:            product.name,
  price:           product.price,
  wholesalePrice:  product.wholesalePrice,
  unitPrice:       resolveUnitPrice(product, quantity, buyMode),
  imageUrl:        product.imageUrl,
  quantity,
  unit:            product.unit,
  minWholesaleQty: product.minWholesaleQty,
  weightKg:        product.weightKg || 1,
});

const buildOrder = ({ number, items, buyMode = 'normal', status, user, address, payment = {}, createdDaysAgo = 0, courier }) => {
  const subtotal       = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const shippingCharge = calculateShipping(subtotal, calculateTotalWeight(items), courier || null);
  const created        = daysAgo(createdDaysAgo);
  return {
    orderNumber:    number,
    user:           user._id,
    items,
    buyMode,
    address,
    subtotal,
    shippingCharge,
    total:          subtotal + shippingCharge,
    status,
    payment,
    createdAt:      created,
    updatedAt:      created,
  };
};

// ─── seed counter for invoice numbers ────────────────────────────────────────
let invCounter = 1000;
let cnCounter  = 1000;
const nextInvNum = () => `INV-${++invCounter}`;
const nextCnNum  = () => `CN-${++cnCounter}`;

// ─── main ─────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();

  // Wipe everything
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Invoice.deleteMany({}),
    Shipment.deleteMany({}),
    Cart.deleteMany({}),
    CourierPartner.deleteMany({}),
  ]);
  console.log('🗑  Cleared all collections');

  if (destroy) {
    console.log('Destroy mode — database emptied. Done.');
    await mongoose.disconnect();
    return;
  }

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const createdUsers = [];
  for (const u of users) {
    createdUsers.push(await User.create(u)); // one-by-one so bcrypt hook runs
  }
  console.log(`✅ Seeded ${createdUsers.length} users`);

  // ── 2. Products ───────────────────────────────────────────────────────────
  const createdProducts = await Product.insertMany(products);
  console.log(`✅ Seeded ${createdProducts.length} products`);

  // Quick lookup helpers
  const P = (name) => createdProducts.find((p) => p.name.includes(name));
  const U = (email) => createdUsers.find((u) => u.email === email);

  const rice    = P('Basmati');
  const oil     = P('Sunflower');
  const atta    = P('Atta');
  const toor    = P('Toor');
  const sugar   = P('Sugar');
  const chana   = P('Chana');
  const mustard = P('Mustard');
  const salt    = P('Rock Salt');

  const ramesh = U('ramesh@example.com');
  const priya  = U('priya@example.com');
  const mahesh = U('mahesh@example.com');

  const rameshAddr  = ramesh.addresses[0].toObject();
  const rameshAddr2 = ramesh.addresses[1].toObject();
  const priyaAddr   = priya.addresses[0].toObject();
  const maheshAddr  = mahesh.addresses[0].toObject();

  // ── 3. Courier Partner ────────────────────────────────────────────────────
  const [bluedart] = await CourierPartner.insertMany([
    {
      name: 'BlueDart',
      contactPerson: 'Rakesh Mehta',
      phone: '1800123456',
      email: 'support@bluedart.com',
      baseCharge: 40,
      perKgCharge: 10,
      freeWeightKg: 5,
      isActive: true,
      notes: 'Preferred for bulk shipments',
    },
  ]);
  console.log('✅ Seeded 1 courier partner');

  // ── 4. Orders ─────────────────────────────────────────────────────────────
  //
  // Ramesh Patel — 5 orders across all statuses
  const rOrders = await Order.insertMany([
    // ORD-1001: delivered, paid via Razorpay, 45 days ago
    buildOrder({
      number:          'ORD-1001',
      items:           [buildItem(rice, 5, 'normal'), buildItem(atta, 10, 'normal')],
      buyMode:         'normal',
      status:          'delivered',
      user:            ramesh,
      address:         rameshAddr,
      createdDaysAgo:  45,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayOrderId:   'order_demo_001',
        razorpayPaymentId: 'pay_demo_001',
        paidAt:            daysAgo(45),
      },
    }),

    // ORD-1002: shipped, 20 days ago
    buildOrder({
      number:          'ORD-1002',
      items:           [buildItem(oil, 2, 'normal'), buildItem(toor, 5, 'normal')],
      buyMode:         'normal',
      status:          'shipped',
      user:            ramesh,
      address:         rameshAddr,
      createdDaysAgo:  20,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayOrderId:   'order_demo_002',
        razorpayPaymentId: 'pay_demo_002',
        paidAt:            daysAgo(20),
      },
    }),

    // ORD-1003: wholesale bulk rice, confirmed (payment done), 10 days ago
    buildOrder({
      number:          'ORD-1003',
      items:           [buildItem(rice, 25, 'wholesale'), buildItem(atta, 50, 'wholesale')],
      buyMode:         'wholesale',
      status:          'confirmed',
      user:            ramesh,
      address:         rameshAddr2,
      createdDaysAgo:  10,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayOrderId:   'order_demo_003',
        razorpayPaymentId: 'pay_demo_003',
        paidAt:            daysAgo(10),
      },
    }),

    // ORD-1004: pending payment, 2 days ago
    buildOrder({
      number:          'ORD-1004',
      items:           [buildItem(sugar, 10, 'normal'), buildItem(salt, 5, 'normal')],
      buyMode:         'normal',
      status:          'pending',
      user:            ramesh,
      address:         rameshAddr,
      createdDaysAgo:  2,
      payment:         { status: 'pending', method: 'razorpay' },
    }),

    // ORD-1005: cancelled, refunded, 30 days ago
    buildOrder({
      number:          'ORD-1005',
      items:           [buildItem(mustard, 3, 'normal')],
      buyMode:         'normal',
      status:          'cancelled',
      user:            ramesh,
      address:         rameshAddr,
      createdDaysAgo:  30,
      payment: {
        status:            'refunded',
        method:            'razorpay',
        razorpayOrderId:   'order_demo_005',
        razorpayPaymentId: 'pay_demo_005',
        paidAt:            daysAgo(30),
        refundId:          'rfnd_demo_005',
        refundStatus:      'processed',
        refundAmount:      600,
      },
    }),
  ]);

  // Priya Shah — 2 orders
  const pOrders = await Order.insertMany([
    buildOrder({
      number:          'ORD-1006',
      items:           [buildItem(chana, 5, 'normal'), buildItem(toor, 5, 'normal')],
      buyMode:         'normal',
      status:          'delivered',
      user:            priya,
      address:         priyaAddr,
      createdDaysAgo:  60,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayPaymentId: 'pay_demo_006',
        paidAt:            daysAgo(60),
      },
    }),
    buildOrder({
      number:          'ORD-1007',
      items:           [buildItem(oil, 1, 'normal'), buildItem(salt, 2, 'normal')],
      buyMode:         'normal',
      status:          'confirmed',
      user:            priya,
      address:         priyaAddr,
      createdDaysAgo:  5,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayPaymentId: 'pay_demo_007',
        paidAt:            daysAgo(5),
      },
    }),
  ]);

  // Mahesh Trader — 2 wholesale orders
  const mOrders = await Order.insertMany([
    buildOrder({
      number:          'ORD-1008',
      items:           [buildItem(rice, 50, 'wholesale'), buildItem(atta, 100, 'wholesale')],
      buyMode:         'wholesale',
      status:          'delivered',
      user:            mahesh,
      address:         maheshAddr,
      createdDaysAgo:  90,
      courier:         bluedart,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayPaymentId: 'pay_demo_008',
        paidAt:            daysAgo(90),
      },
    }),
    buildOrder({
      number:          'ORD-1009',
      items:           [buildItem(toor, 30, 'wholesale'), buildItem(chana, 25, 'wholesale')],
      buyMode:         'wholesale',
      status:          'shipped',
      user:            mahesh,
      address:         maheshAddr,
      createdDaysAgo:  8,
      courier:         bluedart,
      payment: {
        status:            'paid',
        method:            'razorpay',
        razorpayPaymentId: 'pay_demo_009',
        paidAt:            daysAgo(8),
      },
    }),
  ]);

  const allOrders = [...rOrders, ...pOrders, ...mOrders];
  console.log(`✅ Seeded ${allOrders.length} orders`);

  // ── 5. Invoices ───────────────────────────────────────────────────────────
  // Generate sale invoices for every paid order, plus a credit note for the cancelled one
  const invoiceDocs = [];

  for (const ord of allOrders) {
    if (['paid', 'refunded'].includes(ord.payment?.status) || ord.status !== 'pending') {
      if (ord.status !== 'cancelled') {
        invoiceDocs.push({
          invoiceNumber:  nextInvNum(),
          order:          ord._id,
          user:           ord.user,
          type:           'sale',
          items:          ord.items,
          subtotal:       ord.subtotal,
          shippingCharge: ord.shippingCharge,
          total:          ord.total,
          issuedAt:       new Date(ord.createdAt.getTime() + 60_000),
          createdAt:      ord.createdAt,
          updatedAt:      ord.createdAt,
        });
      }
    }
  }

  // Credit note for ORD-1005 (cancelled)
  const ord1005 = allOrders.find((o) => o.orderNumber === 'ORD-1005');
  invoiceDocs.push({
    invoiceNumber:  nextCnNum(),
    order:          ord1005._id,
    user:           ord1005.user,
    type:           'credit_note',
    items:          ord1005.items,
    subtotal:       ord1005.subtotal,
    shippingCharge: ord1005.shippingCharge,
    total:          ord1005.total,
    issuedAt:       daysAgo(29),
    createdAt:      daysAgo(29),
    updatedAt:      daysAgo(29),
  });

  await Invoice.insertMany(invoiceDocs);
  console.log(`✅ Seeded ${invoiceDocs.length} invoices (including 1 credit note)`);

  // ── 6. Shipments ──────────────────────────────────────────────────────────
  const shippedOrDelivered = allOrders.filter((o) => ['shipped', 'delivered'].includes(o.status));

  const shipmentDocs = shippedOrDelivered.map((ord) => {
    const isDelivered = ord.status === 'delivered';
    const base        = new Date(ord.createdAt.getTime() + 2 * 86_400_000); // 2 days after order
    const events      = [
      { status: 'label_created', description: 'Shipment label created', timestamp: base, location: 'Surat Warehouse' },
      { status: 'picked_up',     description: 'Package picked up by courier', timestamp: new Date(base.getTime() + 4 * 3_600_000), location: 'Surat Hub' },
      { status: 'in_transit',    description: 'Package in transit',            timestamp: new Date(base.getTime() + 12 * 3_600_000), location: 'Ahmedabad Hub' },
    ];
    if (isDelivered) {
      events.push({ status: 'out_for_delivery', description: 'Out for delivery', timestamp: new Date(base.getTime() + 24 * 3_600_000), location: 'Delivery Area' });
      events.push({ status: 'delivered',         description: 'Delivered successfully', timestamp: new Date(base.getTime() + 30 * 3_600_000), location: ord.address.city });
    }
    return {
      order:             ord._id,
      courierPartner:    bluedart._id,
      awbNumber:         `BD${Math.floor(100000000 + Math.random() * 900000000)}IN`,
      status:            isDelivered ? 'delivered' : 'in_transit',
      estimatedDelivery: new Date(base.getTime() + 3 * 86_400_000),
      deliveredAt:       isDelivered ? new Date(base.getTime() + 30 * 3_600_000) : undefined,
      trackingEvents:    events,
      createdAt:         base,
      updatedAt:         base,
    };
  });

  const createdShipments = await Shipment.insertMany(shipmentDocs);

  // Link shipments back to their orders
  for (let i = 0; i < shippedOrDelivered.length; i++) {
    await Order.findByIdAndUpdate(shippedOrDelivered[i]._id, { shipment: createdShipments[i]._id });
  }
  console.log(`✅ Seeded ${createdShipments.length} shipments`);

  // ── 7. Carts ──────────────────────────────────────────────────────────────
  // Give each customer a pre-filled cart so the frontend has something to show
  await Cart.insertMany([
    {
      user:    ramesh._id,
      buyMode: 'normal',
      items: [
        { product: rice._id,  quantity: 3 },
        { product: chana._id, quantity: 2 },
      ],
    },
    {
      user:    priya._id,
      buyMode: 'normal',
      items: [
        { product: oil._id,  quantity: 1 },
        { product: salt._id, quantity: 2 },
      ],
    },
    {
      user:    mahesh._id,
      buyMode: 'wholesale',
      items: [
        { product: rice._id,    quantity: 50 },
        { product: atta._id,    quantity: 100 },
        { product: mustard._id, quantity: 20 },
      ],
    },
  ]);
  console.log('✅ Seeded 3 carts');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Demo accounts (password: password123)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin   → admin@babujienterprise.com');
  console.log('  User 1  → ramesh@example.com  (5 orders, cart with 2 items)');
  console.log('  User 2  → priya@example.com   (2 orders, cart with 2 items)');
  console.log('  User 3  → mahesh@example.com  (2 wholesale orders, cart with 3 items)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  console.log('Seed complete. ✓');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
