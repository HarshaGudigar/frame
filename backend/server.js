require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Multi-Tenancy Middleware (Applied globally)
const tenantMiddleware = require('./middleware/tenantMiddleware');
app.use(tenantMiddleware);

// --- Routes ---

// Auth Routes (Public — no auth required)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Marketplace Routes (Browse is public, Purchase is protected inside the route)
const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/marketplace', marketplaceRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
    res.json({ ok: true, routes: ['/api/auth', '/api/marketplace', '/api/admin'] });
});

// Database Connection
const RUNTIME_MODE = process.env.APP_TENANT_ID ? 'SILO' : 'HUB';
mongoose.connect(MONGODB_URI)
    .then(() => console.log(`[${RUNTIME_MODE}] MongoDB connected`))
    .catch(err => console.error(`[${RUNTIME_MODE}] MongoDB error:`, err));

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Alyxnet Frame API',
        mode: RUNTIME_MODE,
        tenant: req.tenant ? req.tenant.name : 'None (Global Context)',
    });
});

// Global Error Handler — catches all unhandled errors from routes
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[${RUNTIME_MODE}] Server running on port ${PORT}`);
});
