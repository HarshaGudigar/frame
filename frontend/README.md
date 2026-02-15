# Alyxnet Frame - Dashboard (Frontend)

The frontend is a modern, responsive administrative dashboard built with **Vite**, **React**, and **TypeScript**. It utilizes **shadcn/ui** and **Tailwind CSS v4** for a high-performance, premium user interface.

## Core Technologies

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: React Context (Auth, Socket)
- **API Client**: Axios with automatic JWT rotation
- **Real-time**: Socket.io-client

## Getting Started

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

## Dashboard Features

- **Multi-Tenant Management**: Full CRUD and monitoring for silo instances.
- **User Management**: RBAC, invite flows, and profile management.
- **Fleet Dashboard**: Real-time CPU/RAM metrics and health status.
- **Marketplace**: Module discovery and provisioning UI.
- **Audit Logs**: Visual history of administrative actions.
