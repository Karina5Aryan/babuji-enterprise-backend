const swaggerJSDoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 5000;

// Full OpenAPI 3 definition for the Babuji Enterprise API.
// Hand-written (rather than route-annotated) so the whole contract lives in
// one place that the frontend team can read top-to-bottom.
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Babuji Enterprise API',
    version: '1.0.0',
    description:
      'Backend API for the Babuji Enterprise wholesale & retail ordering platform.\n\n' +
      '**Auth:** obtain a JWT from `/api/auth/login` or `/api/auth/register`, then click ' +
      '**Authorize** and paste the token (it is sent as `Bearer <token>`).',
  },
  servers: [
    { url: `http://localhost:${PORT}`, description: 'Local development' },
  ],
  tags: [
    { name: 'Auth',      description: 'Registration, login and current user' },
    { name: 'Products',  description: 'Product catalogue (public reads, admin writes)' },
    { name: 'Orders',    description: 'Customer orders' },
    { name: 'Payments',  description: 'Razorpay payment flow and webhook' },
    { name: 'Shipments', description: 'Shipment creation and tracking' },
    { name: 'Couriers',  description: 'Courier partner management' },
    { name: 'Invoices',  description: 'Invoice generation and PDF download' },
    { name: 'Users',     description: 'Own profile and saved addresses' },
    { name: 'Admin',     description: 'Admin-only dashboard and management' },
    { name: 'Health',    description: 'Service health checks' },
    { name: 'Cart',      description: 'Shopping cart management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Not authorized, no token' },
          stack: { type: 'string', description: 'Only present in development' },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a1f2c3e4b0a1234567890a' },
          name: { type: 'string', example: 'Ramesh Patel' },
          phone: { type: 'string', example: '9876543210' },
          line1: { type: 'string', example: '12 Market Road' },
          city: { type: 'string', example: 'Surat' },
          state: { type: 'string', example: 'Gujarat' },
          pincode: { type: 'string', example: '395003' },
          isDefault: { type: 'boolean', example: true },
        },
      },
      AddressInput: {
        type: 'object',
        required: ['name', 'phone', 'line1', 'city', 'pincode'],
        properties: {
          name: { type: 'string', example: 'Ramesh Patel' },
          phone: { type: 'string', example: '9876543210' },
          line1: { type: 'string', example: '12 Market Road' },
          city: { type: 'string', example: 'Surat' },
          state: { type: 'string', example: 'Gujarat' },
          pincode: { type: 'string', example: '395003' },
          isDefault: { type: 'boolean', example: false },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a1f2c3e4b0a1234567890a' },
          name: { type: 'string', example: 'Ramesh Patel' },
          email: { type: 'string', format: 'email', example: 'ramesh@example.com' },
          phone: { type: 'string', example: '9876543210' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user:         { $ref: '#/components/schemas/User' },
          accessToken:  { type: 'string', description: 'Short-lived JWT (15 min). Send as Bearer token.', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refreshToken: { type: 'string', description: 'Long-lived token (30 days). Store securely; use to call /api/auth/refresh.', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          expiresIn:    { type: 'string', example: '15m', description: 'Access token lifetime' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a1f2c3e4b0a1234567890b' },
          name: { type: 'string', example: 'Basmati Rice' },
          description: { type: 'string', example: 'Premium long-grain basmati rice' },
          category: {
            type: 'string',
            example: 'Grains',
            description: 'One of Grains, Oils, Pulses, Sugar & Salt (or any custom value)',
          },
          imageUrl: { type: 'string', example: 'https://example.com/rice.jpg' },
          price: { type: 'number', example: 120, description: 'Retail price per unit' },
          wholesalePrice: { type: 'number', example: 95 },
          stock: { type: 'number', example: 500 },
          unit: { type: 'string', example: 'kg' },
          minWholesaleQty: { type: 'number', example: 25 },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'category', 'price', 'wholesalePrice'],
        properties: {
          name: { type: 'string', example: 'Basmati Rice' },
          description: { type: 'string', example: 'Premium long-grain basmati rice' },
          category: { type: 'string', example: 'Grains' },
          imageUrl: { type: 'string', example: 'https://example.com/rice.jpg' },
          price: { type: 'number', example: 120 },
          wholesalePrice: { type: 'number', example: 95 },
          stock: { type: 'number', example: 500 },
          unit: { type: 'string', example: 'kg' },
          minWholesaleQty: { type: 'number', example: 25 },
          isActive: { type: 'boolean', example: true },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: '66a1f2c3e4b0a1234567890b' },
          name: { type: 'string', example: 'Basmati Rice' },
          price: { type: 'number', example: 120 },
          wholesalePrice: { type: 'number', example: 95 },
          unitPrice: { type: 'number', example: 95, description: 'Actual price charged per unit' },
          imageUrl: { type: 'string' },
          quantity: { type: 'number', example: 25 },
          unit: { type: 'string', example: 'kg' },
          minWholesaleQty: { type: 'number', example: 25 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ORD-1001', description: 'Human order number used as id' },
          _mongoId: { type: 'string', example: '66a1f2c3e4b0a1234567890c' },
          orderNumber: { type: 'string', example: 'ORD-1001' },
          userId: { type: 'string', example: '66a1f2c3e4b0a1234567890a' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          buyMode: { type: 'string', enum: ['normal', 'wholesale'], example: 'wholesale' },
          address: { $ref: '#/components/schemas/Address' },
          subtotal: { type: 'number', example: 2375 },
          shippingCharge: { type: 'number', example: 0 },
          total: { type: 'number', example: 2375 },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            example: 'pending',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderInput: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', example: '66a1f2c3e4b0a1234567890b' },
                quantity: { type: 'number', example: 25 },
              },
            },
          },
          buyMode: { type: 'string', enum: ['normal', 'wholesale'], default: 'normal' },
          addressId: {
            type: 'string',
            description: 'Id of a saved address. Ignored if `address` is provided.',
          },
          address: {
            allOf: [{ $ref: '#/components/schemas/AddressInput' }],
            description: 'Explicit delivery address. Falls back to default saved address if omitted.',
          },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
          orders: { type: 'number', example: 4 },
          totalSpent: { type: 'number', example: 9500 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Courier Partner ──────────────────────────────────────────────────────
      Courier: {
        type: 'object',
        properties: {
          id:              { type: 'string', example: '66a1f2c3e4b0a1234567890f' },
          name:            { type: 'string', example: 'BlueDart' },
          contactPerson:   { type: 'string', example: 'Ramesh Shah' },
          phone:           { type: 'string', example: '1800123456' },
          email:           { type: 'string', format: 'email', example: 'support@bluedart.com' },
          baseCharge:      { type: 'number', example: 40, description: '₹ base delivery charge' },
          perKgCharge:     { type: 'number', example: 10, description: '₹ per kg above freeWeightKg' },
          freeWeightKg:    { type: 'number', example: 5, description: 'First N kg covered by baseCharge' },
          servicePincodes: { type: 'array', items: { type: 'string' }, example: ['395003', '395004'], description: 'Pincodes served (empty = all)' },
          isActive:        { type: 'boolean', example: true },
          notes:           { type: 'string', example: 'Preferred for bulk shipments' },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },
      CourierInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name:            { type: 'string', example: 'BlueDart' },
          contactPerson:   { type: 'string', example: 'Ramesh Shah' },
          phone:           { type: 'string', example: '1800123456' },
          email:           { type: 'string', format: 'email', example: 'support@bluedart.com' },
          baseCharge:      { type: 'number', example: 40, description: '₹ base delivery charge' },
          perKgCharge:     { type: 'number', example: 10, description: '₹ per kg above freeWeightKg' },
          freeWeightKg:    { type: 'number', example: 5, description: 'First N kg covered by baseCharge' },
          servicePincodes: { type: 'array', items: { type: 'string' }, example: ['395003', '395004'], description: 'Pincodes served (empty = all)' },
          isActive:        { type: 'boolean', example: true },
          notes:           { type: 'string', example: 'Preferred for bulk shipments' },
        },
      },
      // ── Shipment ─────────────────────────────────────────────────────────────
      TrackingEvent: {
        type: 'object',
        properties: {
          status:      { type: 'string', enum: ['label_created','picked_up','in_transit','out_for_delivery','delivered','failed_delivery','returned'], example: 'in_transit' },
          location:    { type: 'string', example: 'Ahmedabad Hub' },
          description: { type: 'string', example: 'Package arrived at hub' },
          timestamp:   { type: 'string', format: 'date-time' },
          updatedBy:   { type: 'string', description: 'Admin user id who added this event' },
        },
      },
      Shipment: {
        type: 'object',
        properties: {
          id:                { type: 'string', example: '66a1f2c3e4b0a1234567890d' },
          order:             { type: 'string', description: 'Populated Order object or id', example: '66a1f2c3e4b0a1234567890c' },
          courierPartner:    { $ref: '#/components/schemas/Courier' },
          awbNumber:         { type: 'string', example: 'DL123456789IN' },
          status:            { type: 'string', enum: ['label_created','picked_up','in_transit','out_for_delivery','delivered','failed_delivery','returned'], example: 'in_transit' },
          estimatedDelivery: { type: 'string', format: 'date-time' },
          trackingEvents:    { type: 'array', items: { $ref: '#/components/schemas/TrackingEvent' } },
          deliveredAt:       { type: 'string', format: 'date-time' },
          notes:             { type: 'string', example: 'Handle with care' },
          createdAt:         { type: 'string', format: 'date-time' },
          updatedAt:         { type: 'string', format: 'date-time' },
        },
      },
      ShipmentInput: {
        type: 'object',
        required: ['orderId', 'courierId'],
        properties: {
          orderId:           { type: 'string', example: '66a1f2c3e4b0a1234567890c', description: 'Mongo id of a confirmed order' },
          courierId:         { type: 'string', example: '66a1f2c3e4b0a1234567890f', description: 'Mongo id of a courier partner' },
          awbNumber:         { type: 'string', example: 'DL123456789IN' },
          estimatedDelivery: { type: 'string', format: 'date-time', example: '2026-08-14T00:00:00.000Z' },
          notes:             { type: 'string', example: 'Handle with care' },
        },
      },
      // ── Invoice ──────────────────────────────────────────────────────────────
      Invoice: {
        type: 'object',
        properties: {
          id:             { type: 'string', example: '66a1f2c3e4b0a1234567890e' },
          invoiceNumber:  { type: 'string', example: 'INV-1001' },
          order:          { type: 'string', description: 'Populated Order summary or id' },
          user:           { type: 'string', description: 'Populated User summary or id' },
          type:           { type: 'string', enum: ['sale', 'credit_note'], example: 'sale' },
          items:          { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          subtotal:       { type: 'number', example: 2375 },
          shippingCharge: { type: 'number', example: 0 },
          total:          { type: 'number', example: 2375 },
          issuedAt:       { type: 'string', format: 'date-time' },
          createdAt:      { type: 'string', format: 'date-time' },
          updatedAt:      { type: 'string', format: 'date-time' },
        },
      },
      Dashboard: {
        type: 'object',
        properties: {
          totalOrders: { type: 'number', example: 42 },
          totalProducts: { type: 'number', example: 18 },
          totalCustomers: { type: 'number', example: 30 },
          totalRevenue: { type: 'number', example: 125000 },
          ordersByStatus: {
            type: 'object',
            properties: {
              pending: { type: 'number', example: 5 },
              confirmed: { type: 'number', example: 8 },
              shipped: { type: 'number', example: 10 },
              delivered: { type: 'number', example: 18 },
              cancelled: { type: 'number', example: 1 },
            },
          },
          recentOrders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
          lowStockProducts: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
        },
      },
      // ── Cart ─────────────────────────────────────────────────────────────────
      CartItem: {
        type: 'object',
        properties: {
          product:   { $ref: '#/components/schemas/Product' },
          quantity:  { type: 'number', example: 5 },
          unitPrice: { type: 'number', example: 95, description: 'Resolved retail or wholesale price' },
          lineTotal: { type: 'number', example: 475 },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id:        { type: 'string', example: '66a1f2c3e4b0a1234567890g' },
          buyMode:   { type: 'string', enum: ['normal', 'wholesale'], example: 'normal' },
          items:     { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          subtotal:  { type: 'number', example: 950, description: 'Sum of all line totals' },
          itemCount: { type: 'number', example: 10, description: 'Total units across all items' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddToCartInput: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', example: '66a1f2c3e4b0a1234567890b' },
          quantity:  { type: 'number', example: 2, description: 'Units to add (default 1)' },
        },
      },
      UpdateCartItemInput: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'number', example: 10, description: 'New absolute quantity' },
        },
      },
      SetBuyModeInput: {
        type: 'object',
        required: ['buyMode'],
        properties: {
          buyMode: { type: 'string', enum: ['normal', 'wholesale'], example: 'wholesale' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Authenticated but not allowed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Validation error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Ramesh Patel' },
                  email: { type: 'string', format: 'email', example: 'ramesh@example.com' },
                  phone: { type: 'string', example: '9876543210' },
                  password: { type: 'string', format: 'password', minLength: 6, example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (customer or admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'ramesh@example.com' },
                  password: { type: 'string', format: 'password', example: 'secret123' },
                  role: {
                    type: 'string',
                    enum: ['user', 'admin'],
                    description: 'Optional. If sent, must match the account role.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current logged-in user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description:
          'Exchange a valid refresh token for a new access token + rotated refresh token. ' +
          'Call this automatically when the frontend receives a 401 with an expired access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    description: 'The refresh token received at login/register.',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New tokens issued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Revokes the stored refresh token. After this call, the refresh token is permanently invalid.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string', example: 'Logged out successfully' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category ("All" = no filter)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search name/description/category' },
          { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['true'] }, description: 'Only products with stock > 0' },
        ],
        responses: {
          200: {
            description: 'List of products',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/products/categories': {
      get: {
        tags: ['Products'],
        summary: 'List categories',
        responses: {
          200: {
            description: 'Distinct categories',
            content: { 'application/json': { schema: { type: 'array', items: { type: 'string' }, example: ['Grains', 'Oils', 'Pulses', 'Sugar & Salt'] } } },
          },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a product by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update product (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product (admin)',
        description: 'Soft-deletes by default (sets isActive=false). Pass `?hard=true` to remove permanently.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'hard', in: 'query', schema: { type: 'string', enum: ['true'] } },
        ],
        responses: {
          200: { description: 'Removed', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Product removed' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place a new order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderInput' } } },
        },
        responses: {
          201: { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/orders/my': {
      get: {
        tags: ['Orders'],
        summary: "Current user's orders",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Orders', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/orders/checkout-from-cart': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout from cart',
        description:
          'Reads the current user\'s cart, validates stock for every item, creates an order, ' +
          'decrements stock, and **clears the cart** on success. ' +
          'The cart\'s `buyMode` (normal / wholesale) is inherited by the order automatically.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  addressId: {
                    type: 'string',
                    description: 'Id of a saved address. Falls back to the default address if omitted.',
                    example: '66a1f2c3e4b0a1234567890a',
                  },
                  address: {
                    allOf: [{ $ref: '#/components/schemas/AddressInput' }],
                    description: 'Inline delivery address. Overrides addressId if both are provided.',
                  },
                  courierId: {
                    type: 'string',
                    description: 'Optional courier partner _id to use for shipping calculation.',
                    example: '66a1f2c3e4b0a1234567890f',
                  },
                  paymentMethod: {
                    type: 'string',
                    enum: ['razorpay', 'cod', 'upi'],
                    default: 'razorpay',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created and cart cleared',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get one order',
        description: 'Accepts either the order number (ORD-####) or the Mongo id. Customers can only view their own orders; admins can view any.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-1001' }],
        responses: {
          200: { description: 'Order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/orders/{id}/cancel': {
      put: {
        tags: ['Orders'],
        summary: 'Cancel own order',
        description: 'Only allowed while the order is pending or confirmed. Restores product stock.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-1001' }],
        responses: {
          200: { description: 'Cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get own profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update own profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Ramesh Patel' },
                  phone: { type: 'string', example: '9876543210' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/me/password': {
      put: {
        tags: ['Users'],
        summary: 'Change password',
        description:
          'Verifies the current password before updating. ' +
          'On success, all existing refresh tokens are revoked — the user must log in again on other devices.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password', example: 'password123' },
                  newPassword:     { type: 'string', format: 'password', minLength: 6, example: 'newSecret456' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string', example: 'Password updated successfully. Please log in again.' } } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/users/me/addresses': {
      get: {
        tags: ['Users'],
        summary: 'List saved addresses',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Addresses', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Address' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Add an address',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressInput' } } },
        },
        responses: {
          201: { description: 'Updated address list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Address' } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/me/addresses/{addressId}': {
      put: {
        tags: ['Users'],
        summary: 'Update an address',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressInput' } } } },
        responses: {
          200: { description: 'Updated address list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Address' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete an address',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Updated address list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Address' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Dashboard summary',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Dashboard', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dashboard' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all orders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by order number' },
        ],
        responses: {
          200: { description: 'Orders', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/orders/{id}/status': {
      put: {
        tags: ['Admin'],
        summary: 'Update order status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-1001' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/admin/customers': {
      get: {
        tags: ['Admin'],
        summary: 'List customers with order stats',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Customers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ── Payments ──────────────────────────────────────────────────────────────
    '/api/payments/create-razorpay-order': {
      post: {
        tags: ['Payments'],
        summary: 'Step 1 — Create Razorpay order to open checkout popup',
        description: 'Call this after placing an order (POST /api/orders). Returns the Razorpay order details needed to open the checkout JS popup on the frontend.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId'],
                properties: {
                  orderId: { type: 'string', example: 'ORD-1001', description: 'Order number or Mongo id of a pending order' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Razorpay order created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    razorpayOrderId: { type: 'string', example: 'order_Abc123XYZ' },
                    amount:          { type: 'number', example: 237500, description: 'Amount in paise' },
                    currency:        { type: 'string', example: 'INR' },
                    keyId:           { type: 'string', example: 'rzp_test_XXXXXXXX' },
                    orderNumber:     { type: 'string', example: 'ORD-1001' },
                    name:            { type: 'string', example: 'Babuji Enterprise' },
                    description:     { type: 'string', example: 'Payment for order ORD-1001' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/payments/verify': {
      post: {
        tags: ['Payments'],
        summary: 'Step 2 — Verify Razorpay payment signature',
        description: 'After the Razorpay checkout popup succeeds, send the three Razorpay ids returned by the popup to this endpoint. On success the order is marked **confirmed**.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'orderId'],
                properties: {
                  razorpay_order_id:  { type: 'string', example: 'order_Abc123XYZ' },
                  razorpay_payment_id:{ type: 'string', example: 'pay_Def456UVW' },
                  razorpay_signature: { type: 'string', example: 'a1b2c3d4e5f6...' },
                  orderId:            { type: 'string', example: 'ORD-1001' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment verified — order confirmed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:     { type: 'boolean', example: true },
                    message:     { type: 'string', example: 'Payment verified successfully. Order is confirmed.' },
                    orderNumber: { type: 'string', example: 'ORD-1001' },
                    status:      { type: 'string', example: 'confirmed' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Razorpay webhook receiver (public — called by Razorpay servers)',
        description: 'Razorpay calls this URL for events such as `payment.captured`, `payment.failed`, `refund.created`, and `refund.processed`. Do **not** call this endpoint from the frontend; it is for Razorpay server-to-server calls only. Signature is verified using `x-razorpay-signature` header.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Standard Razorpay webhook payload',
                properties: {
                  event:   { type: 'string', example: 'payment.captured' },
                  payload: { type: 'object' },
                },
              },
            },
          },
        },
        parameters: [
          { name: 'x-razorpay-signature', in: 'header', required: false, schema: { type: 'string' }, description: 'HMAC-SHA256 signature from Razorpay' },
        ],
        responses: {
          200: {
            description: 'Acknowledged',
            content: { 'application/json': { schema: { type: 'object', properties: { received: { type: 'boolean', example: true } } } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    // ── Couriers ──────────────────────────────────────────────────────────────
    '/api/couriers': {
      get: {
        tags: ['Couriers'],
        summary: 'List courier partners',
        description: 'Admins see all (including inactive). Authenticated customers see only active couriers.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of couriers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Courier' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Couriers'],
        summary: 'Create courier partner (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CourierInput' } } },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Courier' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/couriers/{id}': {
      get: {
        tags: ['Couriers'],
        summary: 'Get courier partner by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Courier', content: { 'application/json': { schema: { $ref: '#/components/schemas/Courier' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Couriers'],
        summary: 'Update courier partner (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CourierInput' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Courier' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Couriers'],
        summary: 'Deactivate courier partner (admin — soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deactivated', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Courier partner deactivated successfully' }, courier: { $ref: '#/components/schemas/Courier' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Shipments ─────────────────────────────────────────────────────────────
    '/api/shipments/awb/{awbNumber}': {
      get: {
        tags: ['Shipments'],
        summary: 'Track shipment by AWB number (public)',
        description: 'Anyone can track a shipment using the Air Waybill number. Returns limited public info only (no order details).',
        parameters: [{ name: 'awbNumber', in: 'path', required: true, schema: { type: 'string' }, example: 'DL123456789IN' }],
        responses: {
          200: {
            description: 'Shipment tracking info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    awbNumber:         { type: 'string', example: 'DL123456789IN' },
                    status:            { type: 'string', example: 'in_transit' },
                    courierPartner:    { $ref: '#/components/schemas/Courier' },
                    estimatedDelivery: { type: 'string', format: 'date-time' },
                    deliveredAt:       { type: 'string', format: 'date-time' },
                    trackingEvents:    { type: 'array', items: { $ref: '#/components/schemas/TrackingEvent' } },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/shipments/track/{orderId}': {
      get: {
        tags: ['Shipments'],
        summary: 'Track own order shipment (customer)',
        description: 'Authenticated customer can track the shipment for one of their own orders.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, example: '66a1f2c3e4b0a1234567890c' }],
        responses: {
          200: { description: 'Shipment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipment' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/shipments': {
      get: {
        tags: ['Shipments'],
        summary: 'List all shipments (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['label_created','picked_up','in_transit','out_for_delivery','delivered','failed_delivery','returned'] }, description: 'Filter by shipment status' },
        ],
        responses: {
          200: { description: 'Shipments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Shipment' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Shipments'],
        summary: 'Create shipment for a confirmed order (admin)',
        description: 'Creates a shipment, sets the first tracking event (`label_created`), and moves the linked order to `shipped`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ShipmentInput' } } },
        },
        responses: {
          201: { description: 'Shipment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipment' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/shipments/{id}': {
      get: {
        tags: ['Shipments'],
        summary: 'Get shipment by id (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Shipment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipment' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/shipments/{id}/track': {
      post: {
        tags: ['Shipments'],
        summary: 'Add tracking event to shipment (admin)',
        description: 'Appends a new tracking event and updates the shipment status. If status is `delivered`, the linked order is automatically marked delivered too.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status:      { type: 'string', enum: ['label_created','picked_up','in_transit','out_for_delivery','delivered','failed_delivery','returned'], example: 'in_transit' },
                  location:    { type: 'string', example: 'Ahmedabad Hub' },
                  description: { type: 'string', example: 'Package arrived at hub' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated shipment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipment' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Invoices ──────────────────────────────────────────────────────────────
    '/api/invoices/my': {
      get: {
        tags: ['Invoices'],
        summary: "List current customer's invoices",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List all invoices (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale', 'credit_note'] }, description: 'Filter by invoice type' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by invoice number' },
        ],
        responses: {
          200: { description: 'Invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create invoice for an order (admin)',
        description: 'Idempotent — returns the existing invoice if one of the same type already exists for the order. Optionally emails the PDF to the customer.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId'],
                properties: {
                  orderId:             { type: 'string', example: '66a1f2c3e4b0a1234567890c' },
                  type:                { type: 'string', enum: ['sale', 'credit_note'], default: 'sale' },
                  sendEmailToCustomer: { type: 'boolean', default: false, description: 'If true, emails the PDF to the customer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          200: { description: 'Existing invoice returned (idempotent)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice by id (customer — own, or admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/invoices/{id}/download': {
      get: {
        tags: ['Invoices'],
        summary: 'Download invoice as PDF (customer — own, or admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'PDF file',
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Cart ─────────────────────────────────────────────────────────────────
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get the current user\'s cart',
        description: 'Returns the full cart with resolved prices. Creates an empty cart document if one does not yet exist.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear entire cart',
        description: 'Removes all items from the cart. The cart document itself is kept.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart cleared',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message:   { type: 'string', example: 'Cart cleared' },
                    itemCount: { type: 'number', example: 0 },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/cart/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add item to cart',
        description:
          'Adds the specified quantity to the cart. If the product is already in the cart the quantities are summed. ' +
          'Stock availability is validated before adding.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AddToCartInput' } },
          },
        },
        responses: {
          201: {
            description: 'Item added — full updated cart returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/cart/mode': {
      put: {
        tags: ['Cart'],
        summary: 'Set buy mode (normal / wholesale)',
        description:
          'Switches the cart between retail and wholesale pricing. ' +
          'Wholesale unit price is applied automatically when `quantity >= minWholesaleQty`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SetBuyModeInput' } },
          },
        },
        responses: {
          200: {
            description: 'Buy mode updated — full updated cart returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/cart/item/{productId}': {
      put: {
        tags: ['Cart'],
        summary: 'Update item quantity',
        description: 'Sets the absolute quantity for an item already in the cart. Stock is validated.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' }, description: 'Product _id' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateCartItemInput' } },
          },
        },
        responses: {
          200: {
            description: 'Quantity updated — full updated cart returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove item from cart',
        description: 'Deletes a single product line from the cart.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' }, description: 'Product _id' },
        ],
        responses: {
          200: {
            description: 'Item removed — full updated cart returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJSDoc({ definition, apis: [] });

module.exports = swaggerSpec;
