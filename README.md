# Babuji Enterprise — Backend API

Node.js + Express + MongoDB (Mongoose) REST API powering the
[Babuji Enterprise](https://babuji-enterprise.vercel.app) wholesale & retail
grocery ordering frontend.

The data models, roles, statuses and pricing rules were derived to match the
deployed frontend (products, wholesale pricing tiers, buy modes, order
lifecycle, customer/admin roles).

## Tech stack

- **Express** — HTTP server & routing
- **MongoDB / Mongoose** — data store
- **JWT** (`jsonwebtoken`) — stateless auth, `Authorization: Bearer <token>`
- **bcryptjs** — password hashing

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then edit values (MONGO_URI, JWT_SECRET, ...)

# 3. Seed demo data (products, users, sample orders)
npm run seed

# 4. Run
npm run dev                 # development (nodemon)
npm start                   # production
```

Requires a running MongoDB (local `mongodb://127.0.0.1:27017` or Atlas URI).

### Demo accounts (password: `password123`)

| Role     | Email                          |
|----------|--------------------------------|
| Admin    | `admin@babujienterprise.com`   |
| Customer | `ramesh@example.com`           |

## Data models

**Product**: `name, description, category, imageUrl, price, wholesalePrice, stock, unit, minWholesaleQty`
Categories: `Grains`, `Oils`, `Pulses`, `Sugar & Salt`.

**User**: `name, email, phone, password, role ("user"|"admin"), addresses[]`
**Address** (embedded): `name, phone, line1, city, state, pincode, isDefault`

**Order**: `orderNumber (ORD-####), user, items[], buyMode ("normal"|"wholesale"), address (snapshot), subtotal, shippingCharge, total, status`
Status lifecycle: `pending → confirmed → shipped → delivered` (or `cancelled`).

### Pricing rules

- **Wholesale price** applies when `buyMode = "wholesale"` **and** the line
  quantity ≥ the product's `minWholesaleQty`; otherwise the retail `price`.
- **Shipping**: free above `FREE_SHIPPING_THRESHOLD` (default ₹5000), ₹100 for
  subtotals ≥ ₹2000, otherwise `DEFAULT_SHIPPING_CHARGE` (₹60).
- Prices and totals are always recomputed server-side from live product data —
  the client's prices are never trusted.

## API reference

Base URL: `http://localhost:5000`

### Interactive docs (Swagger)

Full, always-up-to-date OpenAPI documentation is served by the running app:

- **Swagger UI:** http://localhost:5000/api/docs — browse every endpoint, see
  request/response schemas, and try calls directly in the browser.
- **Raw OpenAPI spec:** http://localhost:5000/api/docs.json — import into Postman,
  Insomnia, or an API client generator.

For protected routes, log in via `/api/auth/login`, click **Authorize** in
Swagger UI, and paste the returned token.

### Auth — `/api/auth`
| Method | Path        | Access | Body / notes |
|--------|-------------|--------|--------------|
| POST   | `/register` | Public | `{ name, email, phone, password }` → `{ user, token }` |
| POST   | `/login`    | Public | `{ email, password, role? }` → `{ user, token }` |
| GET    | `/me`       | Auth   | current user |

### Products — `/api/products`
| Method | Path           | Access | Notes |
|--------|----------------|--------|-------|
| GET    | `/`            | Public | `?category=&search=&inStock=true` |
| GET    | `/categories`  | Public | list of categories |
| GET    | `/:id`         | Public | single product |
| POST   | `/`            | Admin  | create |
| PUT    | `/:id`         | Admin  | update |
| DELETE | `/:id`         | Admin  | soft delete (`?hard=true` to remove) |

### Orders — `/api/orders` (all require auth)
| Method | Path           | Access   | Notes |
|--------|----------------|----------|-------|
| POST   | `/`            | Customer | `{ items:[{productId, quantity}], buyMode, addressId? , address? }` |
| GET    | `/my`          | Customer | own orders |
| GET    | `/:id`         | Auth     | by `ORD-####` or Mongo id (own, or any for admin) |
| PUT    | `/:id/cancel`  | Customer | cancel while pending/confirmed (restores stock) |

### Profile & addresses — `/api/users` (auth)
| Method | Path                       | Notes |
|--------|----------------------------|-------|
| GET    | `/me`                      | profile |
| PUT    | `/me`                      | `{ name?, phone? }` |
| GET    | `/me/addresses`            | list |
| POST   | `/me/addresses`            | add |
| PUT    | `/me/addresses/:addressId` | update |
| DELETE | `/me/addresses/:addressId` | delete |

### Admin — `/api/admin` (admin only)
| Method | Path                  | Notes |
|--------|-----------------------|-------|
| GET    | `/dashboard`          | totals, revenue, status breakdown, recent orders, low stock |
| GET    | `/orders`             | `?status=&search=` all orders |
| PUT    | `/orders/:id/status`  | `{ status }` |
| GET    | `/customers`          | customers with order count & spend |

## Connecting the frontend

The frontend currently uses mock/demo data. Point it at this API by setting its
API base URL to this server and sending the JWT as `Authorization: Bearer <token>`.
CORS origins are configured via `CLIENT_ORIGINS` in `.env`.
