# Project Roadmap: Alyxnet Frame

**Goal**: A robust, full-stack framework for delivering diverse customer solutions, featuring a multi-tenant architecture, cross-platform access (Web, Desktop, Mobile), and automated deployment.

---

## Phase 1: Foundation & Core Infrastructure (Completed)

> **Status**: 100% Complete
> The technological bedrock is solid. We have a working monorepo, deployment pipeline, and base functionality.

- [x] **Monorepo Structure**: Unified codebase for Backend, Frontend, Desktop, and Mobile.
- [x] **Containerization**: Single Docker container for Backend + Frontend + Database.
- [x] **CI/CD Pipeline**: Automated deployment to AWS Lightsail via GitHub Actions.
- [x] **Authentication & RBAC**: JWT access/refresh token rotation with role-based access control.
- [x] **Core UI**: Dashboard, Tenant Management, User Management, Audit Logs, and basic Marketplace UI.
- [x] **Fleet Monitoring**: Heartbeat-based metrics collection with dashboard visualization.
- [x] **Module Gateway**: Pluggable module system with auto-discovery, per-module Swagger docs, and tenant-scoped access.
- [x] **Real-Time Foundation**: Socket.io for live notifications (tenant creation, status changes, user invites).
- [x] **Cross-Platform**: Electron Desktop App and React Native Mobile scaffolding.

---

## Phase 1.5: Platform Hardening (Critical Gaps)

> **Status**: 100% Complete
> Gaps discovered during code audit that must be resolved before onboarding real customers. These are not features — they are foundational reliability and security requirements that Phase 1 deferred.

### 1. Authentication & Security Hardening

- [x] **Email-Based User Invites**: Replaced hardcoded `Welcome123!` with a secure invite flow using `VerificationToken` model and Resend email service. Invited users receive a one-time link to set their own password.
- [x] **Email Verification on Registration**: New users are marked unverified on registration. Verification email sent via Resend. Frontend gate blocks access to protected routes until verified. Resend verification endpoint available.
- [x] **Password Reset Flow**: Added `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` with Resend email integration. Anti-enumeration (always returns success). Revokes all refresh tokens on reset.
- [x] **Two-Factor Authentication (TOTP)**: Add optional TOTP-based 2FA using `otplib`. Store encrypted TOTP secret per user. Require 2FA code on login when enabled. Add setup/disable endpoints under `/api/auth/2fa/*`.
- [x] **Socket.io Authentication**: Added JWT verification middleware on socket connection. Rejects unauthenticated sockets. Associates sessions with user IDs via `user:{id}` rooms. Admin/owner auto-join `admin` room.
- [x] **Refresh Token Cleanup Job**: Added `node-cron` job running daily at 03:00. Purges revoked refresh tokens (>30 days), expired refresh tokens, and stale verification tokens (>7 days).
- [x] **Rate Limit Tightening**: Production default set to `20 req/15min`. Added dedicated rate limiters for `/login` (10), `/register` (5), and `/forgot-password` (5) with dev overrides.
- [x] **CSRF Protection**: Documented as not needed — localStorage + Bearer header pattern is inherently CSRF-safe. XSS risk mitigated by Helmet CSP. Migration notes added for future httpOnly cookie adoption.

### 2. Data Layer Reliability

- [x] **MongoDB Backup Strategy**: Added a cron-based `mongodump` job that runs nightly (configurable via `BACKUP_CRON`). Supports three upload providers: `local` (Docker volume), `s3` (AWS S3/Lightsail Object Storage), and `gdrive` (Google Drive via service account). Includes automatic retention cleanup and a `restore.sh` script for disaster recovery.
- [x] **Metrics TTL Activation**: Uncomment and enable the 30-day TTL index on the `Metric` model (`backend/models/Metric.js`) to prevent unbounded collection growth.
- [x] **Tenant Database Provisioning**: Implemented dedicated database provisioning for tenants in SILO mode. When a tenant is created, the system auto-derives a `frame_tenant_{slug}` URI and ensures the database is reachable. Connections are cached and pooled via `tenantDBCache.js`.
- [x] **Graceful Shutdown**: Add `SIGTERM`/`SIGINT` handlers in `server.js` that close the HTTP server, disconnect mongoose, and drain Socket.io connections before exiting. Critical for zero-downtime Docker restarts.

### 3. Frontend Stability

- [x] **Global Error Handling**: Replaced silent `catch {}` blocks and `alert()` calls in `dashboard.tsx`, `tenants.tsx`, `marketplace.tsx`, and `users.tsx` with consistent destructive toast notifications using the existing `useToast` hook.
- [x] **Loading States**: Added skeleton loaders (using the existing `Skeleton` component from shadcn/ui) to Dashboard, Tenants, Users, and Marketplace pages. Skeletons only render on initial load (`loading && data.length === 0`) to avoid flicker on refreshes. Audit Logs already had skeletons.
- [x] **Empty States**: Added empty-state messages to Dashboard ("No fleet instances found.") and Users ("No users found."). Tenants, Marketplace, and Audit Logs already had empty states.
- [x] **Fix Auth Context Bug**: The `User` interface in `auth-context.tsx` defines `lastName` twice. Remove the duplicate. Also remove the unused `isLoading` state variable.
- [x] **Debounce Audit Log Filters**: Created a generic `useDebounce` hook (`src/hooks/use-debounce.ts`) and applied it to audit log filters with a 400ms delay. API calls now fire only after the user stops typing.
- [x] **Date Picker for Audit Logs**: Added native date input fields (Start Date and End Date) to the audit log filter grid using the existing `Input` component with `type="date"`. State and API params were already wired.
- [x] **Reconnection Strategy for Socket.io**: Added explicit reconnection config (`reconnectionAttempts: 10`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 30000`) to `socket-provider.tsx`. Toast notifications on disconnect, reconnect, and reconnect failure. Added a connection status indicator (green/red dot) with tooltip in the layout header.

### 4. DevOps & Deployment Hardening

- [x] **Docker Separation**: Split the monolithic Docker setup into three dedicated services (`mongo`, `backend`, `frontend`) using `Dockerfile.backend`, `Dockerfile.frontend`, and `docker-compose.yml`. Improved build reliability by modernizing GPG key installation for MongoDB tools. `backend` (`Dockerfile.backend` with Node.js), `frontend` (`Dockerfile.frontend` with multi-stage Nginx build). Includes `nginx.conf` for SPA fallback and API/WebSocket proxying. Original monolithic setup preserved as legacy fallback.
- [x] **Health Check in Docker**: Added `HEALTHCHECK` instruction to all Dockerfiles (monolithic, backend, frontend) hitting `GET /api/health`. Added matching `healthcheck` block to `docker-compose.yml`. Split Dockerfiles include health checks by default.
- [x] **Deployment Rollback**: `deploy.yml` now snapshots the current image as `frame-app:rollback` before rebuilding. Polls `docker inspect` health status every 5s for 60s. On failure, rolls back to the previous image automatically.
- [x] **Environment Variable Validation**: Added `backend/.env.example` and `frontend/.env.example` documenting every variable with `[REQUIRED]`/`[Optional]`/`[Conditional]` labels, grouped by section (Server, Auth, Fleet, Email, CORS, Rate Limiting, Logging, Backup, Multi-Tenancy).
- [x] **Separate Build and Test Stages**: Added `build-docker` job to `test.yml` that runs after unit tests. Builds the monolithic image, starts a container, polls health endpoint, runs integration tests (health, frontend, API), and builds split images as a compile check. Updated `actions/checkout` and `actions/setup-node` to v4.

---

## Phase 2: The Business Engine (Operations & Tenant Lifecycle)

> **Status**: 100% Complete
> The framework is now a platform. We have automated provisioning, dependency management, usage tracking, and a complete tenant lifecycle engine.

### 1. Marketplace & Provisioning (The "App Store" Logic)

- [x] **Provisioning Engine**: Automate the "install" process. When a user assigns a product to a tenant, the system should: (a) create a `Subscription` record, (b) add the module slug to `tenant.subscribedModules`, (c) call the module's `init()` hook to set up any required database collections or seed data, and (d) emit a `module:provisioned` socket event.
- [x] **Module Dependencies**: Added a `dependencies` field to the module manifest. Before provisioning, the system validates that all dependency modules are already subscribed.
- [x] **Module Versioning & Rollout**: Added `version` and `minPlatformVersion` to module manifests. Subscriptions now track `moduleVersion` per tenant, enabling future canary rollouts.
- [x] **Product CRUD Completion**: Added full CRUD (Create, Read, Update, Delete) for marketplace products. Soft delete implemented via `isActive: false`.
- [x] **Product Categories & Search**: Added `category` field and implemented search/filtering in the product catalog.
- [x] **First Production Module**: Built the CRM module end-to-end to validate the entire module lifecycle: discovery, provisioning, access control, tenant-scoped API routing, and multi-tenant database isolation.

### 2. Tenant Lifecycle Management

- [x] **Tenant Onboarding Wizard**: Added scaffolding for a multi-step onboarding flow with `onboardingProgress` tracking per tenant.
- [x] **Tenant Suspension & Reactivation**: Added `suspended` status to the Tenant model. Suspended tenants are blocked from all API routes via global middleware.
- [x] **Tenant Data Export**: Added owner-only export endpoint that generates a comprehensive JSON dump of tenant metadata, subscriptions, and usage history.
- [x] **White-Labeling**: Added `branding` support (logo, colors, domains) to the Tenant model, served via API for frontend customization.
- [x] **Trial Period Support**: Implemented trial period logic with auto-expiry. A new daily cron job (`trialCleanup`) transitions expired trials to `expired` and revokes module access.

### 3. Usage Tracking (Pre-Billing Foundation)

- [x] **API Call Metering**: Implemented lightweight `usageMiddleware` that tracks API calls per tenant/module, aggregating hourly counts in the `UsageMeter` collection.
- [x] **Usage Dashboard**: Added admin API for viewing real-time usage trends and historical aggregates per tenant.

---

## Phase 3: Platform Integrity Sprint (Next 6 Weeks)

> **Status**: 100% Complete
> Invisible foundations that prevent architectural collapse at scale. These are structural and architectural debts that must be paid before adding more modules.

### 1. Module System Contract Layer

- [x] **Module Manifest Standard (`manifest.json`)**: Formalize dependencies, required permissions, emitted events, and consumed events for every module. This decoupling is required before building a third-party developer marketplace.

### 2. Internal Event Backbone

- [x] **Centralized Event Bus**: Implement an internal event bus (e.g., Redis Streams) to act as the single source of truth for all asynchronous actions. AI features, webhooks, audit logs, and real-time collaboration will all subscribe to this bus rather than building separate pub/sub mechanisms.

### 3. Data Model Boundaries

- [x] **Tenant-Scoped Query Middleware**: Enforce explicit data boundaries at the database query layer, wrapping Mongoose operations to guarantee Tenant A can never see Tenant B's data (moving beyond application-layer conventions).

### 4. Developer Tools

- [x] **Developer Debug Panel (Quick Win)**: Build an admin-only debug panel to visualize resolved tenant context, active modules, feature flags, and real-time emitted events per request. This forms the foundation for future observability.

---

## Phase 3.5: Granular RBAC Matrix (Next Priority)

> **Status**: In Progress
> Upgrading from rigid string-based roles ('admin', 'owner') to a customizable Attribute-Based Access Control (ABAC) matrix, allowing users to define discrete permissions per role.

### 1. Backend RBAC Engine

- [ ] **Role Data Model**: Create a new `Role` MongoDB schema that maps a role name to an array of defined permission strings (e.g., `['users:read', 'users:write']`).
- [ ] **Middleware Rewrite**: Build and integrate `requirePermission('string')` middleware to replace the legacy `requireRole('string')` guard.
- [ ] **Global vs. Tenant Matrices**: Ensure support for both Hub-level roles (management) and Silo-level roles (tenant operations).

### 2. Frontend Matrix UI

- [ ] **Permission Hook Update**: Refactor `use-permission.tsx` to check against an array of granted permission strings.
- [ ] **Interactive Matrix UI**: Build the 'Role Matrix' settings page to allow visual assignment of permissions to roles via an interactive grid format.

---

## Phase 4: Monetization First (Following 8 Weeks)

> **Status**: In Progress
> Shifting Stripe billing forward from Enterprise scale. The platform needs a revenue engine.

### 1. Commercialization Layer

- [ ] **Stripe Integration**: Integrate Stripe Checkout for subscription billing. Map each `Product` to a Stripe Price ID. Tie `UsageMeter` directly to Stripe usage-based pricing.
- [ ] **Invoice & Billing History**: Add billing page showing payment history, current plan, and upcoming charges. Wire Stripe webhooks to automatically suspend tenants on failed payments and reactivate on success.
- [ ] **Self-Service Plan Management**: Allow admins to upgrade/downgrade plans and modules via a Billing Settings page proxied through Stripe Customer Portal.

---

## Phase 5: Platform Intelligence & Orchestration

> **Status**: Planned
> Features that make the platform smart, built on a unified architectural layer.

### 1. Unified AI Orchestration (Hybrid Architecture)

- [ ] **AI Gateway Service (Hub)**: Build a central service that abstracts LLM providers (AWS Bedrock, OpenAI, Anthropic), manages prompts, handles context injection, tracks token counts, and meters AI usage per tenant for billing.
- [ ] **Data & Tool Execution Context (Silo)**: Ensure the actual querying of data and execution of tools happens strictly within the Tenant's Silo boundaries to prevent cross-tenant data leaks.
- [ ] **Generative Analytics ("Ask Your Data")**: Connect the AI Orchestrator to tenant-scoped Vector databases or robust Mongoose aggregation pipelines to answer natural language questions (e.g., "Revenue trend for standard rooms").
- [ ] **Task Automation Copilot**: Allow modules to register "Tools" (e.g., `cancel_booking`, `generate_invoice`) with the Event Bus, enabling the AI to execute multi-step workflows securely on behalf of the user.
- [ ] **Generative UI Components**: Ensure the AI returns interactive React components (charts, forms) directly within the chat interface, rather than just plain text.

### 2. Real-Time Collaboration

- [ ] **Global Presence System**: Track and display which users are online and what page they're viewing.
- [ ] **Contextual Comments**: "Comment anywhere" functionality with @mentions via the new Event Bus. (Live cursors are deferred to Phase 6).

---

## Phase 6: Vertical Solutions (Composition)

> **Status**: Strategic Planning
> Scaling via composition, not forks. Verticals are "Solution Templates" that bundle base platform features, modules, and complaint flags.

### 1. Solution Templates

- [ ] **Alyxnet Health**: Bundle EMR, Telemedicine, Scheduling, and HIPAA compliance flags.
- [ ] **Alyxnet Retail**: Bundle POS Terminal, Inventory Management, and Offline Sync.
- [ ] **Alyxnet Field**: Bundle Job Dispatch, GPS Tracking, and Evidence Capture.
- [ ] **Alyxnet Agency**: Bundle Client Portals, Project Trackers, and White-Labeling.

---

## Phase 7: Enterprise Scale & Commercialization

> **Status**: Long-Term
> Requirements for scaling large enterprise clients.

### 1. Identity & Compliance

- [ ] **SSO Integration (SAML 2.0 / OIDC)**: Enterprise tenant IdP connection.
- [ ] **Mandatory 2FA Enforcement**: Tenant-level policy enforcement.
- [ ] **Data Residency Controls**: Region-specific database routing and backups based on tenant preference.

### 2. Fleet Management at Scale

- [ ] **"God View" Dashboard**: Global map showing all tenant silo instances and statuses.
- [ ] **Automated Silo Provisioning**: Infrastructure-as-code for dedicated VM spin-up upon enterprise onboarding.

---

## Phase 8: Platform Maturity & Observability

> **Status**: Long-Term
> The practices that separate a startup product from a production-grade platform.

- [ ] **Observability Stack**: Distributed tracing (OpenTelemetry), Metrics Pipeline (Prometheus), and Centralized Log Aggregation.
- [ ] **Quality Gates**: E2E tests (Playwright), Vitest suites, and automated security scanning.

---

## Current Platform Statistics

| Metric                     | Value      |
| :------------------------- | :--------- |
| **Total Registered Users** | 0          |
| **Active Tenants**         | 0          |
| **Collected Metrics**      | 0          |
| **System Uptime**          | ~0h        |
| **Last Audit**             | 2026-02-21 |

---

## Ongoing: Technical Health & Maintenance

> **Status**: Continuous
> Keeping the engine running smoothly.

- [ ] **Dependency Management**: Quarterly audit of all npm dependencies. Update React, Node, Electron, and Expo versions. Monitor for security advisories.
- [ ] **API Documentation**: Keep Swagger/OpenAPI specs in sync with code. Add request/response examples for all endpoints. Publish versioned docs.
- [ ] **Database Index Review**: Quarterly review of MongoDB indexes. Add compound indexes for common query patterns. Remove unused indexes.
- [ ] **Mobile Polish**: Continuous improvement of the React Native UX. Match native platform conventions (iOS/Android). Add deep linking and push notifications.
- [ ] **Desktop App**: Bring Electron app to parity with web features. Add auto-update mechanism (electron-updater). Support offline mode with local data sync.
- [ ] **Accessibility (a11y)**: Audit all frontend components for WCAG 2.1 AA compliance. Add ARIA labels, keyboard navigation, screen reader support, and focus management.
- [ ] **Internationalization (i18n)**: Extract all user-facing strings into locale files. Add react-i18next. Support RTL layouts. Start with English and Arabic (or target market languages).
- [ ] **Performance Budgets**: Set Lighthouse score targets (Performance > 90, Accessibility > 90). Monitor bundle size with `vite-plugin-bundle-analyzer`. Alert on regressions in CI.
