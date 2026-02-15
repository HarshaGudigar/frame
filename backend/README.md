# Alyxnet Frame - Backend (Express + MongoDB)

The backend is a robust RESTful API and WebSocket server built with **Node.js** and **Express**. It handles multi-tenancy, authentication, metrics collection, and module discovery.

## Core Technologies

- **Runtime**: Node.js 20+
- **Framework**: Express 5.x
- **Database**: MongoDB (via Mongoose 9.x)
- **Real-time**: Socket.io
- **Email**: Resend
- **Logging**: Pino
- **API Documentation**: Swagger (OpenAPI 3.0)

## Getting Started

### Development

```bash
npm install
npm run start
```

### Configuration

Create a `.env` file in this directory with the following variables:

- `PORT`: Server port (default: `5000`).
- `MONGODB_URI`: Connection string for MongoDB.
- `JWT_SECRET`: Secret for signing access tokens.
- `RESEND_API_KEY`: API key for email services.
- `HEARTBEAT_SECRET`: Security key for fleet metrics.

## Key Features

- **JWT Authentication**: Access and refresh token rotation.
- **RBAC**: Role-based access control (Owner, Admin, Staff, User).
- **Socket.io Integration**: Real-time event broadcasting and authenticated rooms.
- **Module discovery**: Automatic loading and scoping of tenant modules.
- **Rate Limiting**: Security-hardened endpoints (Login, Register, Forgot Password).
- **Graceful Shutdown**: SIGTERM handling for zero-downtime restarts.
