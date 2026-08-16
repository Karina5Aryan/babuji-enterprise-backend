// Seed data mirrored from the deployed Babuji Enterprise frontend demo data.

const products = [
  {
    name: 'Premium Basmati Rice',
    description: 'Long-grain aromatic basmati rice, aged for the perfect texture',
    category: 'Grains',
    images: [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', key: 'seed/basmati-rice.jpg' }],
    price: 120, wholesalePrice: 95, stock: 500, unit: 'kg', minWholesaleQty: 25, weightKg: 1,
  },
  {
    name: 'Refined Sunflower Oil',
    description: 'Light and healthy cooking oil, rich in Vitamin E',
    category: 'Oils',
    images: [{ url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', key: 'seed/sunflower-oil.jpg' }],
    price: 180, wholesalePrice: 155, stock: 200, unit: 'L', minWholesaleQty: 20, weightKg: 0.9,
  },
  {
    name: 'Toor Dal (Split Pigeon Peas)',
    description: 'High protein lentils, perfect for everyday cooking',
    category: 'Pulses',
    images: [{ url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', key: 'seed/toor-dal.jpg' }],
    price: 140, wholesalePrice: 115, stock: 300, unit: 'kg', minWholesaleQty: 20, weightKg: 1,
  },
  {
    name: 'Wheat Flour (Atta)',
    description: 'Stone-ground whole wheat flour for soft rotis',
    category: 'Grains',
    images: [{ url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', key: 'seed/wheat-flour.jpg' }],
    price: 45, wholesalePrice: 35, stock: 800, unit: 'kg', minWholesaleQty: 50, weightKg: 1,
  },
  {
    name: 'Sugar (M-grade)',
    description: 'Fine granulated white sugar, perfect sweetness',
    category: 'Sugar & Salt',
    images: [{ url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400', key: 'seed/sugar.jpg' }],
    price: 42, wholesalePrice: 35, stock: 600, unit: 'kg', minWholesaleQty: 50, weightKg: 1,
  },
  {
    name: 'Chana Dal',
    description: 'Split chickpea lentils, rich in fiber and protein',
    category: 'Pulses',
    images: [{ url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', key: 'seed/chana-dal.jpg' }],
    price: 110, wholesalePrice: 88, stock: 250, unit: 'kg', minWholesaleQty: 20, weightKg: 1,
  },
  {
    name: 'Mustard Oil',
    description: 'Cold pressed mustard oil with authentic flavor',
    category: 'Oils',
    images: [{ url: 'https://images.unsplash.com/photo-1629187087-29f20c3e92eb?w=400', key: 'seed/mustard-oil.jpg' }],
    price: 200, wholesalePrice: 170, stock: 150, unit: 'L', minWholesaleQty: 20, weightKg: 0.9,
  },
  {
    name: 'Rock Salt (Sendha Namak)',
    description: 'Pure Himalayan pink rock salt, mineral rich',
    category: 'Sugar & Salt',
    images: [{ url: 'https://images.unsplash.com/photo-1519721458196-25f2137bc9c5?w=400', key: 'seed/rock-salt.jpg' }],
    price: 60, wholesalePrice: 45, stock: 400, unit: 'kg', minWholesaleQty: 25, weightKg: 1,
  },
];

// Default password for every seeded account (demo)
const DEMO_PASSWORD = 'password123';

const users = [
  {
    name: 'Babuji Admin',
    email: 'admin@babujienterprise.com',
    phone: '9900112233',
    password: DEMO_PASSWORD,
    role: 'admin',
    addresses: [],
  },
  {
    name: 'Ramesh Patel',
    email: 'ramesh@example.com',
    phone: '9876543210',
    password: DEMO_PASSWORD,
    role: 'user',
    addresses: [
      {
        name: 'Ramesh Patel',
        phone: '9876543210',
        line1: '12, Sardar Nagar',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
        isDefault: true,
      },
      {
        name: 'Ramesh Patel (Office)',
        phone: '9876543210',
        line1: 'Shop No 5, Textile Market, Ring Road',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395002',
        isDefault: false,
      },
    ],
  },
  {
    name: 'Priya Shah',
    email: 'priya@example.com',
    phone: '9845123456',
    password: DEMO_PASSWORD,
    role: 'user',
    addresses: [
      {
        name: 'Priya Shah',
        phone: '9845123456',
        line1: '45, Diamond Nagar',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395004',
        isDefault: true,
      },
    ],
  },
  {
    name: 'Mahesh Trader',
    email: 'mahesh@example.com',
    phone: '9712345678',
    password: DEMO_PASSWORD,
    role: 'user',
    addresses: [
      {
        name: 'Mahesh Trader',
        phone: '9712345678',
        line1: '78, Wholesale Market, Ring Road',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395002',
        isDefault: true,
      },
      {
        name: 'Mahesh Trader (Warehouse)',
        phone: '9712345678',
        line1: 'Plot 12B, GIDC Industrial Estate',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395010',
        isDefault: false,
      },
    ],
  },
];

module.exports = { products, users, DEMO_PASSWORD };
