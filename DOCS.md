# Alyxnet Frame — User Documentation

> Comprehensive guide for installing, configuring, deploying, and extending the Alyxnet Frame platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Installation](#local-installation)
4. [Configuration Reference](#configuration-reference)
5. [Architecture: Hub vs Silo](#architecture-hub-vs-silo)
6. [Running in Hub Mode](#running-in-hub-mode)
7. [Running in Silo Mode](#running-in-silo-mode)
8. [Docker Deployment](#docker-deployment)
9. [Production Deployment (AWS Lightsail)](#production-deployment-aws-lightsail)
10. [Creating Custom Modules](#creating-custom-modules)
11. [Backup & Restore](#backup--restore)
12. [API Reference](#api-reference)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Alyxnet Frame is a **multi-tenant SaaS platform** built with the MERN stack. It provides:

- **Multi-tenancy** with isolated databases per tenant
- **Module marketplace** for purchasing and provisioning features
- **Role-based access control** (Owner → Admin → Staff → User)
- **Two runtime modes**: Hub (control plane) and Silo (dedicated tenant instance)
- **Real-time events** via Socket.io
- **Automated CI/CD** with Docker and GitHub Actions

### Tech Stack

| Layer     | Technology                            |
| :-------- | :------------------------------------ |
| Frontend  | Vite + React + TypeScript + shadcn/ui |
| Backend   | Node.js 20+ / Express 5.x             |
| Database  | MongoDB 6.0+ (via Mongoose 9.x)       |
| Real-time | Socket.io                             |
| Email     | Resend                                |
| Logging   | Pino                                  |
| API Docs  | Swagger (OpenAPI 3.0)                 |
| Container | Docker + Docker Compose               |
| CI/CD     | GitHub Actions → AWS Lightsail        |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool    | Version | Purpose                  |
| :------ | :------ | :----------------------- |
| Node.js | 20+     | Runtime                  |
| npm     | 10+     | Package manager          |
| MongoDB | 6.0+    | Database (local dev)     |
| Git     | Latest  | Version control          |
| Docker  | 24+     | Containerized deployment |

> **Note:** For local development without Docker, MongoDB must be running on `localhost:27017`.

---

## Local Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/HarshaGudigar/frame.git
cd frame
```

### Step 2: Install Dependencies

```bash
# Install root dependencies (concurrently for running frontend + backend)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Configure Environment Variables

```bash
# Copy the example env file
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set the required values:

```env
# REQUIRED — The server will not start without this
JWT_SECRET=your-strong-random-secret-here

# OPTIONAL but recommended for full functionality
HEARTBEAT_SECRET=your-heartbeat-secret
RESEND_API_KEY=re_your-resend-api-key
```

> **Tip:** Generate a strong secret with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Step 4: Start MongoDB

```bash
# If you have MongoDB installed locally:
mongod --dbpath /data/db

# Or via Docker:
docker run -d -p 27017:27017 --name frame-mongo mongo:6
```

### Step 5: Start the Application

```bash
# From the root directory — starts both frontend and backend
npm run dev
```

This launches:

- **Backend** on `http://localhost:5000`
- **Frontend** on `http://localhost:5173`
- **API Docs** at `http://localhost:5000/api/docs`

### Step 6: Log In with the Default Admin

On first startup, a default **owner** account is automatically seeded into the database. You can log in immediately:

| Field    | Value               |
| :------- | :------------------ |
| Email    | `admin@frame.local` |
| Password | `Admin@123`         |

1. Open `http://localhost:5173` in your browser.
2. Log in with the credentials above.
3. You'll have full **owner** access to the admin dashboard.

> **⚠️ Important:** Change the default password immediately via **Settings → Profile** in production.

> **Note:** The seed runs only once. If any user with the `owner` role already exists, the default account is not created.

---

## Configuration Reference

All configuration lives in `backend/.env`. The full reference:

### Required

| Variable     | Description                              |
| :----------- | :--------------------------------------- |
| `JWT_SECRET` | Secret key for signing JWT access tokens |

### Optional (Recommended)

| Variable           | Default                       | Description                                |
| :----------------- | :---------------------------- | :----------------------------------------- |
| `HEARTBEAT_SECRET` | —                             | API key for silo→hub heartbeat auth        |
| `RESEND_API_KEY`   | —                             | Resend API key for email (invites, verify) |
| `APP_URL`          | `http://localhost:5173`       | Frontend URL used in email links           |
| `EMAIL_FROM`       | `Alyxnet Frame <noreply@...>` | Sender address for emails                  |

### Server

| Variable          | Default                                       | Description                         |
| :---------------- | :-------------------------------------------- | :---------------------------------- |
| `PORT`            | `5000`                                        | Backend server port                 |
| `NODE_ENV`        | `development`                                 | `development`, `production`, `test` |
| `MONGODB_URI`     | `mongodb://localhost:27017/mern-app`          | MongoDB connection string           |
| `CORS_ORIGINS`    | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins     |
| `BODY_SIZE_LIMIT` | `10kb`                                        | Max request body size               |
| `LOG_LEVEL`       | `info`                                        | Pino log level                      |

### Multi-Tenancy (Silo Mode Only)

| Variable                 | Default | Description                                        |
| :----------------------- | :------ | :------------------------------------------------- |
| `APP_TENANT_ID`          | —       | Tenant slug — **set this to enable Silo mode**     |
| `APP_TENANT_NAME`        | —       | Display name for the tenant                        |
| `APP_SUBSCRIBED_MODULES` | —       | Comma-separated module slugs (e.g., `crm,billing`) |

### Rate Limiting

| Variable                   | Default (prod / dev) | Description                      |
| :------------------------- | :------------------- | :------------------------------- |
| `RATE_LIMIT_MAX_AUTH`      | `20` / `1000`        | Max auth requests per window     |
| `RATE_LIMIT_LOGIN_MAX`     | `10` / `1000`        | Max login attempts per window    |
| `RATE_LIMIT_REGISTER_MAX`  | `5` / `1000`         | Max register attempts per window |
| `RATE_LIMIT_FORGOT_PW_MAX` | `5` / `1000`         | Max forgot-password per window   |

### Backup

| Variable                | Default     | Description                     |
| :---------------------- | :---------- | :------------------------------ |
| `BACKUP_ENABLED`        | `false`     | Enable automated backups        |
| `BACKUP_PROVIDER`       | `local`     | `local`, `s3`, or `gdrive`      |
| `BACKUP_CRON`           | `0 2 * * *` | Backup schedule (cron syntax)   |
| `BACKUP_RETENTION_DAYS` | `7`         | Days to keep old backups        |
| `BACKUP_DIR`            | `/backups`  | Local backup directory          |
| `BACKUP_S3_BUCKET`      | —           | S3 bucket name (if provider=s3) |
| `BACKUP_S3_REGION`      | `us-east-1` | AWS region                      |

---

## Architecture: Hub vs Silo

Frame supports two runtime modes that enable flexible multi-tenant architectures:

```
┌──────────────────────────────────────────────────────────┐
│                     HUB (Control Plane)                  │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Auth    │  │  Marketplace │  │  Tenant Manager    │ │
│  │  System   │  │   & Store    │  │  (CRUD, Suspend)   │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
│                        │                                 │
│              ┌─────────┼─────────┐                       │
│              ▼         ▼         ▼                       │
│         ┌─────────┬─────────┬─────────┐                  │
│         │Tenant A │Tenant B │Tenant C │  (Shared DB)     │
│         │  DB     │  DB     │  DB     │                  │
│         └─────────┴─────────┴─────────┘                  │
└──────────────────────────────────────────────────────────┘
                    │ Heartbeat │
          ┌─────────┘           └──────────┐
          ▼                                ▼
┌───────────────────┐          ┌───────────────────┐
│   SILO Instance   │          │   SILO Instance   │
│   (Tenant A VM)   │          │   (Tenant B VM)   │
│                   │          │                   │
│  ┌─────────────┐  │          │  ┌─────────────┐  │
│  │ Local Mongo │  │          │  │ Local Mongo │  │
│  │  (Tenant A) │  │          │  │  (Tenant B) │  │
│  └─────────────┘  │          │  └─────────────┘  │
│  Modules: crm     │          │  Modules: crm,erp │
└───────────────────┘          └───────────────────┘
```

### Hub Mode (Default)

The **Hub** is the central control plane. It manages all tenants, the marketplace, user accounts, and provisions modules. All API traffic passes through the Hub, which routes requests to the correct tenant database.

**Use Hub mode when:**

- You want a single deployment serving all tenants
- You're managing the platform (admin dashboard)
- You want shared infrastructure for cost efficiency

### Silo Mode

A **Silo** is a dedicated instance running for a single tenant. It has its own MongoDB, its own set of modules, and operates independently. Silos send heartbeats back to the Hub for fleet monitoring.

**Use Silo mode when:**

- A tenant needs dedicated infrastructure (compliance, performance)
- You want complete data isolation
- You're deploying on a tenant's own VM or cloud account

---

## Running in Hub Mode

Hub mode is the **default**. Simply start the application without setting `APP_TENANT_ID`.

### Quick Start

```bash
# 1. Ensure your .env does NOT have APP_TENANT_ID set
# 2. Start normally
npm run dev
```

You'll see in the logs:

```
[HUB] Server running on port 5000 (with WebSockets)
[HUB] 1 module(s) loaded
```

### Hub Capabilities

| Feature             | Endpoint                      | Description                          |
| :------------------ | :---------------------------- | :----------------------------------- |
| Authentication      | `POST /api/auth/*`            | Register, login, 2FA, password reset |
| Tenant Management   | `GET/POST /api/admin/tenants` | Create, update, suspend tenants      |
| User Management     | `GET/POST /api/admin/users`   | Invite, deactivate, change roles     |
| Marketplace         | `GET/POST /api/marketplace/*` | Browse, create, purchase products    |
| Module Provisioning | Automatic                     | Triggered on marketplace purchase    |
| Audit Logs          | `GET /api/admin/audit-logs`   | Track all administrative actions     |
| Usage Metering      | `GET /api/admin/usage`        | Per-tenant API call metrics          |
| Health Check        | `GET /api/health`             | System status + DB connectivity      |

### Creating a Tenant (Hub)

```bash
# Via API
curl -X POST http://localhost:5000/api/admin/tenants \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme-corp"}'
```

Or use the **Dashboard UI** at `http://localhost:5173` → Tenants → Create Tenant.

### Assigning Modules to a Tenant

1. Go to **Marketplace** in the dashboard
2. Find the module (e.g., "CRM")
3. Click **Assign to Tenant**
4. Select the tenant and click **Provision Now**

This triggers the provisioning engine, which:

- Validates dependencies
- Calls the module's `onProvision()` hook
- Updates the tenant's `subscribedModules`
- Emits a real-time Socket.io event

---

## Running in Silo Mode

To run a dedicated instance for a single tenant:

### Step 1: Configure Environment

Create a `.env` file for the silo instance:

```env
# ─── Silo Identity ────────────────────────────────────
APP_TENANT_ID=acme-corp
APP_TENANT_NAME=Acme Corporation
APP_SUBSCRIBED_MODULES=crm

# ─── Server ───────────────────────────────────────────
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/frame_tenant_acme-corp
JWT_SECRET=unique-secret-for-this-silo

# ─── Optional ─────────────────────────────────────────
HEARTBEAT_SECRET=hub-heartbeat-key
CORS_ORIGINS=https://acme.yourdomain.com
```

### Step 2: Start the Silo

```bash
cd backend
node server.js
```

You'll see:

```
[SILO] Server running on port 5000 (with WebSockets)
[SILO] 1 module(s) loaded
```

### Step 3: Verify Silo Mode

```bash
curl http://localhost:5000/api/health
```

Response:

```json
{
    "success": true,
    "mode": "SILO",
    "uptime": "12s",
    "database": { "status": "connected" }
}
```

### Silo Behavior Differences

| Behavior        | Hub                          | Silo                              |
| :-------------- | :--------------------------- | :-------------------------------- |
| Tenant identity | `x-tenant-id` header         | `APP_TENANT_ID` env var           |
| Database        | Dynamic per-tenant routing   | Local MongoDB (single tenant)     |
| Module access   | Based on tenant subscription | Based on `APP_SUBSCRIBED_MODULES` |
| Marketplace     | Full CRUD + purchases        | Read-only (modules pre-assigned)  |
| Admin dashboard | Manage all tenants           | Manage only this tenant           |

### Deploying a Silo via Docker

```bash
docker run -d \
  --name silo-acme \
  -p 5000:5000 \
  -e APP_TENANT_ID=acme-corp \
  -e APP_TENANT_NAME="Acme Corporation" \
  -e APP_SUBSCRIBED_MODULES=crm \
  -e JWT_SECRET=silo-specific-secret \
  -e MONGODB_URI=mongodb://localhost:27017/frame_tenant_acme-corp \
  -v acme_data:/data/db \
  frame-app:latest
```

---

## Docker Deployment

### Local Docker Build

```bash
# Build and start (from project root)
docker compose up -d --build

# Check health status
docker inspect --format='{{.State.Health.Status}}' frame-app

# View logs
docker logs frame-app -f

# Stop and remove
docker compose down
```

### What the Container Includes

The monolithic Dockerfile packages:

- **MongoDB 6.0** (runs inside the container)
- **Node.js backend** (Express API on port 5000)
- **Static frontend** (Vite build served on port 3000)
- **Health check** (polls `/api/health` every 10s)

### Exposed Ports

| Port | Service           |
| :--- | :---------------- |
| 3000 | Frontend (static) |
| 5000 | Backend API       |

### Persistent Volumes

| Volume         | Mount Point | Purpose            |
| :------------- | :---------- | :----------------- |
| `mongodb_data` | `/data/db`  | MongoDB data files |
| `backup_data`  | `/backups`  | Automated backups  |

---

## Production Deployment (AWS Lightsail)

### Prerequisites

1. An **AWS Lightsail instance** (Ubuntu 22.04 LTS, 1GB+ RAM recommended)
2. **Docker** and **Docker Compose** installed on the instance
3. **SSH access** to the instance
4. A **GitHub repository** with the Frame codebase

### Step 1: Set Up the Lightsail Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@YOUR_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Install Docker Compose (included with modern Docker)
docker compose version
```

### Step 2: Clone and Configure

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/frame.git ~/frame
cd ~/frame

# Create backend .env for production
cat > backend/.env <<EOF
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/mern-app
JWT_SECRET=$(openssl rand -hex 64)
HEARTBEAT_SECRET=$(openssl rand -hex 32)
RESEND_API_KEY=re_your-key-here
CORS_ORIGINS=http://YOUR_IP:3000,https://yourdomain.com
APP_URL=http://YOUR_IP:3000
EOF
```

### Step 3: Update Frontend Production URL

Edit `frontend/.env.production`:

```env
VITE_API_URL=http://YOUR_IP:5000/api
```

### Step 4: Build and Deploy

```bash
sudo docker compose up -d --build
```

### Step 5: Verify Deployment

```bash
# Check container health
sudo docker inspect --format='{{.State.Health.Status}}' frame-app
# Expected: "healthy"

# Test the API
curl http://YOUR_IP:5000/api/health

# Access the dashboard
# Open http://YOUR_IP:3000 in your browser
```

### Step 6: Set Up CI/CD (Automated Deploys)

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret               | Value                               |
| :------------------- | :---------------------------------- |
| `LIGHTSAIL_HOST`     | Your instance's public IP           |
| `LIGHTSAIL_USERNAME` | `ubuntu`                            |
| `LIGHTSAIL_SSH_KEY`  | Contents of your `.pem` private key |

3. Push to `main` — the deployment workflow triggers automatically.

The CI/CD pipeline:

1. SSHs into your Lightsail instance
2. Pulls the latest code
3. Rebuilds the Docker container
4. Waits for the health check to pass
5. Rolls back automatically if the health check fails

---

## Creating Custom Modules

Modules are self-contained features that can be installed per-tenant via the Marketplace.

### Step 1: Copy the Template

```bash
cp -r backend/modules/_template backend/modules/your-module
```

### Step 2: Define Your Module

Edit `backend/modules/your-module/index.js`:

```javascript
const routes = require('./routes');

module.exports = {
    name: 'Your Module Name',
    slug: 'your-module', // Must match folder name
    version: '1.0.0',
    description: 'What this module does.',
    routes,

    // Called when a tenant purchases this module
    onProvision: async (tenant, logger) => {
        logger.info({ tenant: tenant.slug }, 'Module provisioned');
        // Seed initial data, create collections, etc.
    },
};
```

### Step 3: Create Routes

Edit `backend/modules/your-module/routes.js`:

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        success: true,
        data: { message: 'Your module is working!' },
    });
});

module.exports = router;
```

### Step 4: Restart the Server

The module loader auto-discovers it:

```
Module discovered: your-module v1.0.0
Module routes registered: /api/m/your-module
```

### Step 5: Add to Marketplace

Create a product in the Marketplace (via API or dashboard) with `slug: 'your-module'`. Tenants can then purchase and use it.

### Module API Access

All module routes are mounted under `/api/m/{slug}/`:

```
GET  /api/m/crm/leads          → CRM module's leads endpoint
POST /api/m/your-module/       → Your module's root endpoint
```

Requests require the `x-tenant-id` header (Hub) or `APP_TENANT_ID` env (Silo).

---

## Backup & Restore

### Enable Automated Backups

Add to `backend/.env`:

```env
BACKUP_ENABLED=true
BACKUP_PROVIDER=local          # or s3, gdrive
BACKUP_CRON=0 2 * * *          # Daily at 2 AM UTC
BACKUP_RETENTION_DAYS=7
BACKUP_DIR=/backups
```

### Manual Backup

```bash
# Inside the Docker container
docker exec frame-app mongodump --out /backups/$(date +%Y%m%d)
```

### Restore from Backup

```bash
# Restore a specific backup
docker exec frame-app mongorestore /backups/20260216/
```

### S3 Backup Configuration

```env
BACKUP_PROVIDER=s3
BACKUP_S3_BUCKET=your-bucket-name
BACKUP_S3_REGION=us-east-1
BACKUP_S3_PREFIX=frame-backups/
```

---

## API Reference

Interactive API documentation is available at `/api/docs` (Swagger UI) when the server is running.

### Core Endpoints

| Method | Endpoint                    | Auth | Description               |
| :----- | :-------------------------- | :--- | :------------------------ |
| POST   | `/api/auth/register`        | No   | Register a new user       |
| POST   | `/api/auth/login`           | No   | Login and get tokens      |
| POST   | `/api/auth/refresh-token`   | No   | Refresh access token      |
| POST   | `/api/auth/logout`          | Yes  | Revoke refresh token      |
| PATCH  | `/api/auth/profile`         | Yes  | Update profile / password |
| POST   | `/api/auth/forgot-password` | No   | Request password reset    |
| POST   | `/api/auth/reset-password`  | No   | Reset password with token |
| POST   | `/api/auth/verify-email`    | No   | Verify email address      |
| GET    | `/api/auth/2fa/status`      | Yes  | Check 2FA status          |
| POST   | `/api/auth/2fa/setup`       | Yes  | Begin 2FA setup           |
| POST   | `/api/auth/2fa/disable`     | Yes  | Disable 2FA               |
| GET    | `/api/health`               | No   | System health check       |

### Admin Endpoints (Requires `admin` or `owner` role)

| Method | Endpoint                    | Description                    |
| :----- | :-------------------------- | :----------------------------- |
| GET    | `/api/admin/tenants`        | List all tenants               |
| POST   | `/api/admin/tenants`        | Create a tenant                |
| PUT    | `/api/admin/tenants/:id`    | Update a tenant                |
| DELETE | `/api/admin/tenants/:id`    | Delete a tenant                |
| GET    | `/api/admin/users`          | List all users (owner only)    |
| POST   | `/api/admin/users/invite`   | Invite a user via email        |
| PATCH  | `/api/admin/users/:id/role` | Change user role (owner only)  |
| DELETE | `/api/admin/users/:id`      | Deactivate a user (owner only) |
| GET    | `/api/admin/audit-logs`     | View audit trail               |
| GET    | `/api/admin/usage`          | View usage metrics             |

### Marketplace Endpoints

| Method | Endpoint                        | Auth | Description                   |
| :----- | :------------------------------ | :--- | :---------------------------- |
| GET    | `/api/marketplace/products`     | Yes  | List/search products          |
| POST   | `/api/marketplace/products`     | Yes  | Create a product (admin)      |
| PUT    | `/api/marketplace/products/:id` | Yes  | Update a product (admin)      |
| DELETE | `/api/marketplace/products/:id` | Yes  | Soft-delete a product (admin) |
| POST   | `/api/marketplace/purchase`     | Yes  | Purchase/provision a module   |

### Hotel Module Endpoints (v2.0.0)

All hotel routes are mounted under `/api/m/hotel/` and require the `x-tenant-id` header (Hub mode) or `APP_TENANT_ID` env (Silo mode). The tenant must have the `hotel` module subscribed.

#### Rooms

| Method | Endpoint             | Auth Required | Role Restriction | Description                     |
| :----- | :------------------- | :------------ | :--------------- | :------------------------------ |
| GET    | `/m/hotel/rooms`     | Yes           | —                | List all rooms                  |
| GET    | `/m/hotel/rooms/:id` | Yes           | —                | Get single room                 |
| POST   | `/m/hotel/rooms`     | Yes           | admin, owner     | Create a room                   |
| PATCH  | `/m/hotel/rooms/:id` | Yes           | admin, owner     | Update room (fields, status)    |
| DELETE | `/m/hotel/rooms/:id` | Yes           | admin, owner     | Delete room (blocked if booked) |

#### Customers

| Method | Endpoint                 | Auth Required | Role Restriction | Description         |
| :----- | :----------------------- | :------------ | :--------------- | :------------------ |
| GET    | `/m/hotel/customers`     | Yes           | —                | List all customers  |
| GET    | `/m/hotel/customers/:id` | Yes           | —                | Get single customer |
| POST   | `/m/hotel/customers`     | Yes           | —                | Register a customer |
| PATCH  | `/m/hotel/customers/:id` | Yes           | —                | Update customer     |

#### Bookings

| Method | Endpoint                          | Auth Required | Role Restriction | Description                                                      |
| :----- | :-------------------------------- | :------------ | :--------------- | :--------------------------------------------------------------- |
| GET    | `/m/hotel/bookings`               | Yes           | —                | List all bookings (populated)                                    |
| GET    | `/m/hotel/bookings/:id`           | Yes           | —                | Get single booking                                               |
| POST   | `/m/hotel/bookings`               | Yes           | —                | Create booking (auto-calculates checkout, rent, check-in number) |
| POST   | `/m/hotel/bookings/:id/check-in`  | Yes           | —                | Check in (Confirmed -> CheckedIn)                                |
| POST   | `/m/hotel/bookings/:id/check-out` | Yes           | —                | Check out (CheckedIn -> CheckedOut)                              |
| POST   | `/m/hotel/bookings/:id/cancel`    | Yes           | —                | Cancel booking                                                   |
| POST   | `/m/hotel/bookings/:id/no-show`   | Yes           | —                | Mark as no-show (Confirmed only)                                 |

**Create Booking Payload:**

```json
{
    "customerId": "ObjectId (or provide customerData to create inline)",
    "roomId": "ObjectId (required)",
    "checkInDate": "ISO 8601 datetime (required)",
    "numberOfDays": 2,
    "serviceType": "24 Hours | 12 Hours | 12 PM",
    "checkInType": "Walk In | Online Booking",
    "maleCount": 1,
    "femaleCount": 1,
    "childCount": 0,
    "agentId": "ObjectId (optional)",
    "purposeOfVisit": "Business",
    "advanceAmount": 500
}
```

Auto-generated on creation: `checkOutDate`, `roomRent` (room.pricePerNight x numberOfDays), `checkInNumber` (CHK-YYYYMMDD-NNNN).

#### Booking Services (sub-resource)

| Method | Endpoint                                    | Auth Required | Role Restriction | Description                                         |
| :----- | :------------------------------------------ | :------------ | :--------------- | :-------------------------------------------------- |
| GET    | `/m/hotel/bookings/:bookingId/services`     | Yes           | —                | List services on a booking                          |
| POST   | `/m/hotel/bookings/:bookingId/services`     | Yes           | —                | Add a service (price auto-filled from Service.rate) |
| PATCH  | `/m/hotel/bookings/:bookingId/services/:id` | Yes           | —                | Update quantity (total recomputed)                  |
| DELETE | `/m/hotel/bookings/:bookingId/services/:id` | Yes           | —                | Remove service from booking                         |

#### Services

| Method | Endpoint                | Auth Required | Role Restriction | Description        |
| :----- | :---------------------- | :------------ | :--------------- | :----------------- |
| GET    | `/m/hotel/services`     | Yes           | —                | List all services  |
| GET    | `/m/hotel/services/:id` | Yes           | —                | Get single service |
| POST   | `/m/hotel/services`     | Yes           | admin, owner     | Create a service   |
| PATCH  | `/m/hotel/services/:id` | Yes           | admin, owner     | Update a service   |
| DELETE | `/m/hotel/services/:id` | Yes           | admin, owner     | Delete a service   |

#### Agents

| Method | Endpoint              | Auth Required | Role Restriction | Description      |
| :----- | :-------------------- | :------------ | :--------------- | :--------------- |
| GET    | `/m/hotel/agents`     | Yes           | —                | List all agents  |
| GET    | `/m/hotel/agents/:id` | Yes           | —                | Get single agent |
| POST   | `/m/hotel/agents`     | Yes           | admin, owner     | Create an agent  |
| PATCH  | `/m/hotel/agents/:id` | Yes           | admin, owner     | Update an agent  |
| DELETE | `/m/hotel/agents/:id` | Yes           | admin, owner     | Delete an agent  |

#### Settings (Configurable Picklists)

| Method | Endpoint                  | Auth Required | Role Restriction | Description                        |
| :----- | :------------------------ | :------------ | :--------------- | :--------------------------------- |
| GET    | `/m/hotel/settings`       | Yes           | —                | List all settings types            |
| GET    | `/m/hotel/settings/:type` | Yes           | —                | Get options for a settings type    |
| POST   | `/m/hotel/settings`       | Yes           | admin, owner     | Create a new settings type         |
| PATCH  | `/m/hotel/settings/:type` | Yes           | admin, owner     | Update options for a settings type |
| DELETE | `/m/hotel/settings/:type` | Yes           | admin, owner     | Delete a settings type             |

Default seeded types on provision: `roomType`, `idProofType`, `purposeOfVisit`.

#### Business Info

| Method | Endpoint                 | Auth Required | Role Restriction | Description                    |
| :----- | :----------------------- | :------------ | :--------------- | :----------------------------- |
| GET    | `/m/hotel/business-info` | Yes           | —                | Get business info (singleton)  |
| PUT    | `/m/hotel/business-info` | Yes           | admin, owner     | Create or update business info |

#### Transactions

| Method | Endpoint                    | Auth Required | Role Restriction | Description                                          |
| :----- | :-------------------------- | :------------ | :--------------- | :--------------------------------------------------- |
| GET    | `/m/hotel/transactions`     | Yes           | —                | List transactions (query: `?type=Expense&from=&to=`) |
| GET    | `/m/hotel/transactions/:id` | Yes           | —                | Get single transaction                               |
| POST   | `/m/hotel/transactions`     | Yes           | —                | Create a transaction                                 |
| PATCH  | `/m/hotel/transactions/:id` | Yes           | —                | Update a transaction                                 |
| DELETE | `/m/hotel/transactions/:id` | Yes           | admin, owner     | Delete a transaction                                 |

#### Transaction Categories

| Method | Endpoint                              | Auth Required | Role Restriction | Description         |
| :----- | :------------------------------------ | :------------ | :--------------- | :------------------ |
| GET    | `/m/hotel/transaction-categories`     | Yes           | —                | List all categories |
| GET    | `/m/hotel/transaction-categories/:id` | Yes           | —                | Get single category |
| POST   | `/m/hotel/transaction-categories`     | Yes           | admin, owner     | Create a category   |
| PATCH  | `/m/hotel/transaction-categories/:id` | Yes           | admin, owner     | Update a category   |
| DELETE | `/m/hotel/transaction-categories/:id` | Yes           | admin, owner     | Delete a category   |

---

## Troubleshooting

### Container stays "unhealthy"

**Symptom:** `docker inspect` shows `status=unhealthy`.

**Check logs:**

```bash
sudo docker logs frame-app --tail 50
```

**Common causes:**

- **MongoDB lock file:** Stale `mongod.lock` from previous container. The Dockerfile cleans this automatically, but if you see `DBPathInUse`, manually clear it:
    ```bash
    docker exec frame-app rm -f /data/db/mongod.lock /data/db/WiredTiger.lock
    docker restart frame-app
    ```
- **Missing `JWT_SECRET`:** The backend will exit immediately. Ensure `backend/.env` has it set.
- **Port conflict:** Ensure ports 3000 and 5000 are not in use by other processes.

### "MongoDB connection failed"

**Cause:** MongoDB isn't running or isn't ready yet.

**Fix (local):** Start MongoDB manually: `mongod --dbpath /data/db`

**Fix (Docker):** The container has retry logic (10 attempts, 3s apart). If it still fails, check the volume:

```bash
docker volume rm frame_mongodb_data
docker compose up -d --build
```

### "Email verification required"

**Cause:** The `requireVerifiedEmail` middleware blocks unverified users in production.

**Fix (development):** The bypass is automatic when `NODE_ENV=development`.

**Fix (production):** Verify the user manually:

```bash
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./models/GlobalUser');
    await User.updateOne({ email: 'user@example.com' }, { isEmailVerified: true });
    console.log('Done');
    process.exit(0);
});
"
```

### "CORS blocked request"

**Cause:** The frontend origin isn't in the `CORS_ORIGINS` list.

**Fix:** Add your frontend URL to `CORS_ORIGINS` in `backend/.env`:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

### Orphan containers warning

**Symptom:** `Found orphan containers (frame-frontend frame-backend frame-mongo)`

**Fix:** These are from an older multi-service docker-compose setup. Clean them up:

```bash
sudo docker compose down --remove-orphans
sudo docker compose up -d --build
```

### Deployment rolls back

**Symptom:** CI/CD shows "Rolling back to previous image..."

**Fix:** Check the container logs in the GitHub Actions output (they are now printed automatically on failure). Common causes:

1. Missing environment variables on the server
2. MongoDB lock file (fixed in latest Dockerfile)
3. Network issues during `npm install` in Docker build

---

## Support

- **API Docs:** `http://your-server:5000/api/docs`
- **Health Check:** `http://your-server:5000/api/health`
- **Repository:** `https://github.com/HarshaGudigar/frame`
