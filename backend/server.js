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

message: 'Alyxnet Frame API',
    mode: RUNTIME_MODE,
        tenant: req.tenant ? req.tenant.name : 'None (Global Context)',
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[${RUNTIME_MODE}] Server running on port ${PORT}`);
});
