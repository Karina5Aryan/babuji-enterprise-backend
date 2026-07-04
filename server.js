require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./src/config/db');
const swaggerSpec = require('./src/config/swagger');
const { notFound, errorHandler } = require('./src/middleware/error');

const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// CORS — allow configured frontend origins (or all in dev if none set)
const origins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  })
);

app.use(express.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Babuji Enterprise API', time: new Date().toISOString() });
});
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// API documentation (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Babuji Enterprise API Docs' }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

module.exports = app;
