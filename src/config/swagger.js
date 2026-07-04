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
    { name: 'Auth', description: 'Registration, login and current user' },
    { name: 'Products', description: 'Product catalogue (public reads, admin writes)' },
    { name: 'Orders', description: 'Customer orders' },
    { name: 'Users', description: 'Own profile and saved addresses' },
    { name: 'Admin', description: 'Admin-only dashboard and management' },
    { name: 'Health', description: 'Service health checks' },
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
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
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
  },
};

const swaggerSpec = swaggerJSDoc({ definition, apis: [] });

module.exports = swaggerSpec;
