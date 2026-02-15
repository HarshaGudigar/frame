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
- [x] **Tenant Database Provisioning**: When a tenant is created on the Hub, auto-creates a `frame_tenant_{slug}` database on the same MongoDB instance. Stores the URI in `Tenant.dbUri`. `tenantDBCache.js` wired into Hub middleware for tenant DB connections. Cleanup on tenant deletion drops the provisioned database.
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

- [x] **Docker Compose Separation**: Split into three services via `docker-compose.split.yml`: `mongo` (official `mongo:6.0`), `backend` (`Dockerfile.backend` with Node.js), `frontend` (`Dockerfile.frontend` with multi-stage Nginx build). Includes `nginx.conf` for SPA fallback and API/WebSocket proxying. Original monolithic setup preserved as legacy fallback.
- [x] **Health Check in Docker**: Added `HEALTHCHECK` instruction to all Dockerfiles (monolithic, backend, frontend) hitting `GET /api/health`. Added matching `healthcheck` block to `docker-compose.yml`. Split Dockerfiles include health checks by default.
- [x] **Deployment Rollback**: `deploy.yml` now snapshots the current image as `frame-app:rollback` before rebuilding. Polls `docker inspect` health status every 5s for 60s. On failure, rolls back to the previous image automatically.
- [x] **Environment Variable Validation**: Added `backend/.env.example` and `frontend/.env.example` documenting every variable with `[REQUIRED]`/`[Optional]`/`[Conditional]` labels, grouped by section (Server, Auth, Fleet, Email, CORS, Rate Limiting, Logging, Backup, Multi-Tenancy).
- [x] **Separate Build and Test Stages**: Added `build-docker` job to `test.yml` that runs after unit tests. Builds the monolithic image, starts a container, polls health endpoint, runs integration tests (health, frontend, API), and builds split images as a compile check. Updated `actions/checkout` and `actions/setup-node` to v4.

---

## Phase 2: The Business Engine (Operations & Tenant Lifecycle)

> **Status**: Not Started
> Turning the framework into a platform that manages real customers. Payment processing is deferred to Phase 5 — this phase focuses on marketplace operations, provisioning, and tenant management.

### 1. Marketplace & Provisioning (The "App Store" Logic)

- [ ] **Provisioning Engine**: Automate the "install" process. When a user assigns a product to a tenant, the system should: (a) create a `Subscription` record, (b) add the module slug to `tenant.subscribedModules`, (c) call the module's `init()` hook to set up any required database collections or seed data, and (d) emit a `module:provisioned` socket event.
- [ ] **Module Dependencies**: Add a `dependencies` field to the module manifest (`index.js`). Before provisioning, validate that all dependency modules are already subscribed. Surface missing dependencies in the assignment flow UI.
- [ ] **Module Versioning & Rollout**: Add `version` and `minPlatformVersion` to module manifests. Support canary rollouts by allowing specific tenants to be pinned to a module version. Track `moduleVersion` per tenant in the Subscription model.
- [ ] **Product CRUD Completion**: The marketplace currently has no edit or delete endpoints. Add `PUT /api/marketplace/products/:id` and `DELETE /api/marketplace/products/:id` (soft delete via `isActive: false`). Add the corresponding UI in the frontend.
- [ ] **Product Categories & Search**: Add a `category` field to the Product model. Add search/filter capabilities to `GET /api/marketplace/products` (query by name, category). Implement frontend filtering UI.
- [ ] **First Production Module**: Build one real module (e.g., a simple CRM or Task Manager) end-to-end to validate the entire module lifecycle: discovery, provisioning, access control, API routing, and Swagger docs.

### 2. Tenant Lifecycle Management

- [ ] **Tenant Onboarding Wizard**: After a new tenant is created, redirect to a multi-step onboarding flow: (1) choose modules, (2) invite team members, (3) configure basic settings. Track onboarding completion percentage.
- [ ] **Tenant Suspension & Reactivation**: Add `suspended` status to the Tenant model. Suspended tenants cannot access any API routes (enforced in `tenantMiddleware`). Allow manual suspension and reactivation from the admin panel.
- [ ] **Tenant Data Export**: Add `GET /api/admin/tenants/:id/export` that generates a JSON dump of all tenant data (users, subscriptions, metrics). Required for GDPR compliance and tenant offboarding.
- [ ] **White-Labeling**: Add a `branding` subdocument to the Tenant model with fields: `logo` (URL), `primaryColor`, `faviconUrl`, `loginDomain`. Serve tenant-specific branding via a new `GET /api/branding/:slug` public endpoint. Apply branding dynamically in the frontend login page and sidebar.
- [ ] **Trial Period Support**: Add `trialDays` to the Product model. When a tenant is assigned a trial-eligible product, set `Subscription.status = 'trialing'` with an `expiryDate`. Add a scheduled job (node-cron) that transitions expired trials to `expired` and removes module access. No payment integration needed — trials are admin-managed.

### 3. Usage Tracking (Pre-Billing Foundation)

- [ ] **API Call Metering**: Add a lightweight middleware that counts API calls per tenant per module. Store hourly aggregates in a `UsageMeter` collection. This data will feed into Stripe billing when payment is added in Phase 5.
- [ ] **Usage Dashboard**: Expose `GET /api/admin/usage/:tenantId` for admin visibility. Build a frontend Usage page showing API call counts, storage usage, and trends per tenant. No billing logic — purely operational insight.

---

## Phase 3: Platform Intelligence (AI & Automation)

> **Status**: Planned
> Features that make the platform smart and reduce manual operations.

### 1. Operational Intelligence (Internal AI)

- [ ] **Anomaly Detection for Fleet Metrics**: Analyze heartbeat data to detect anomalies (CPU spikes, memory leaks, unusual downtime patterns). Use a simple rolling-average threshold or integrate with a lightweight ML model. Trigger alerts via Socket.io and email when anomalies are detected.
- [ ] **Predictive Scaling Recommendations**: Based on historical metrics, suggest when a tenant should upgrade their silo resources. Surface recommendations in the fleet dashboard.
- [ ] **Smart Audit Log Summarization**: Use an LLM to generate daily/weekly summaries of audit log activity (e.g., "3 new tenants created, 2 users deactivated, 1 failed deployment"). Deliver via email digest to owners.
- [ ] **Automated Incident Response**: Define runbook-style rules (e.g., "if tenant offline for >10 minutes, attempt SSH restart"). Execute automated recovery actions and log results.

### 2. Tenant-Facing AI Features (Revenue Generators)

- [ ] **Generative Analytics ("Ask Your Data")**: Text-to-query interface for tenant admins. User types a natural language question, system generates a MongoDB aggregation pipeline, executes it against the tenant's database, and returns formatted results with charts. Implement as a marketplace module.
- [ ] **AI Sales Rep (SDR Module)**: Marketplace module that connects to a tenant's CRM data. Uses LLM to qualify leads, draft outreach emails, and suggest next actions. Integrates with email APIs (SendGrid) for automated sequences.
- [ ] **Content Factory Module**: Marketplace module for auto-generating marketing content. Takes brand guidelines and topic inputs, produces blog posts, social media copy, and email templates. Supports localization.
- [ ] **Smart Copilot**: In-app assistant (chat widget) that helps users navigate the platform, find features, and answer questions about their data. Context-aware based on current page and user role.

### 3. Real-Time Collaboration

- [ ] **Presence System**: Track which users are online and what page they're viewing. Show avatar indicators on shared resources (tenants, settings). Use Socket.io rooms per page.
- [ ] **Live Cursors**: For collaborative editing views (e.g., tenant settings, module configuration), show other users' cursor positions in real-time using CRDT or OT.
- [ ] **Contextual Comments**: "Comment anywhere" functionality. Users can attach comments to any entity (tenant, product, user, metric data point). Threaded replies with @mentions. Store in a polymorphic `Comment` collection.

---

## Phase 4: Vertical Solutions (Go-to-Market)

> **Status**: Strategic Planning
> Specific "flavors" of the platform tailored to industry needs. Each vertical is a collection of marketplace modules with industry-specific configurations.

### 1. "Alyxnet Health" (Clinic Management)

- **Focus**: Privacy, compliance (HIPAA-readiness), and patient engagement.
- **Key Modules**:
    - EMR (Electronic Medical Records) with field-level encryption
    - Telemedicine (WebRTC video calls with recording)
    - Appointment Scheduling with SMS/email reminders
    - Patient Portal (self-service booking, lab results, prescriptions)
    - Consent Management (digital signatures, form versioning)
- **Technical Requirements**: Audit trail per-record, data residency controls, encrypted backups

### 2. "Alyxnet Retail" (POS & Inventory)

- **Focus**: Offline reliability, real-time inventory, and multi-location support.
- **Key Modules**:
    - POS Terminal (barcode scanning via mobile camera, receipt printing)
    - Inventory Management (stock levels, reorder alerts, supplier tracking)
    - Offline Mode (WatermelonDB for local-first data, sync on reconnect)
    - Loyalty Program (points, tiers, promotions engine)
    - Multi-Store Dashboard (aggregate sales, compare locations)
- **Technical Requirements**: Conflict resolution for offline sync, thermal printer integration, low-latency barcode lookup

### 3. "Alyxnet Field" (Service & Logistics)

- **Focus**: Geo-location, evidence capture, and job dispatch.
- **Key Modules**:
    - Job Dispatch (assign, schedule, route optimization)
    - GPS Tracking (live worker location on map, geofencing)
    - Evidence Capture (photo upload with GPS metadata, signature pad, timestamped notes)
    - Customer Portal (job status tracking, approval workflows)
    - Fleet Vehicle Tracking (OBD-II integration, mileage logging)
- **Technical Requirements**: Background location on mobile, offline photo queue, map tile caching

### 4. "Alyxnet Agency" (Digital Agency / Consultancy)

- **Focus**: Client management, project delivery, and automated reporting.
- **Key Modules**:
    - Client Portal (branded per-client dashboard with shared files and reports)
    - Project Tracker (Kanban boards, time tracking, milestones)
    - Automated Reporting (scheduled PDF/email reports with charts from client data)
    - Proposal Builder (template-based proposals with e-signature)
    - White-Label Reseller (agency resells the platform under their own brand)
- **Technical Requirements**: PDF generation, email templating, multi-brand theming

---

## Phase 5: Enterprise Scale & Commercialization

> **Status**: Planned
> Requirements for landing large enterprise clients and processing payments. Payment infrastructure is intentionally deferred to this phase — the platform must be operationally stable before handling money.

### 1. Commercialization Layer (Payments & Billing)

- [ ] **Stripe Integration**: Integrate Stripe Checkout for subscription billing. Map each `Product` to a Stripe Price ID. On purchase, create a Stripe Checkout session. On webhook confirmation (`checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`), update the `Subscription` status. Store Stripe customer ID on the `GlobalUser` model.
- [ ] **Usage-Based Billing**: Connect the `UsageMeter` data (built in Phase 2) to Stripe usage-based pricing. Report metered usage to Stripe at the end of each billing cycle. Support per-module and per-tenant metering.
- [ ] **Invoice & Billing History**: Add `GET /api/billing/invoices` that returns Stripe invoice history for the authenticated user's tenant. Build a frontend Billing page showing payment history, current plan, and upcoming charges.
- [ ] **Payment-Triggered Suspension**: Wire Stripe `invoice.payment_failed` webhook to automatically suspend tenants after grace period. Reactivate on successful payment via `invoice.paid` webhook.
- [ ] **Pricing Tiers**: Support multiple pricing tiers per product (e.g., Starter, Professional, Enterprise) with feature gating. Store tier metadata on the Subscription model. Enforce tier limits in module access middleware.
- [ ] **Self-Service Plan Management**: Allow tenant admins to upgrade/downgrade plans, add/remove modules, and update payment methods through a Billing Settings page. Proxy through Stripe Customer Portal.

### 2. Identity & Access Management

- [ ] **SSO Integration (SAML 2.0 / OIDC)**: Allow enterprise tenants to connect their identity provider (Okta, Azure AD, Google Workspace). Map IdP groups to platform roles. Support SP-initiated and IdP-initiated login.
- [ ] **Mandatory 2FA Enforcement**: Tenant-level policy to require 2FA for all users. Block login for users who haven't set up 2FA. Support backup codes and recovery flows.
- [ ] **Session Management Dashboard**: Show active sessions per user with device info, IP, and location. Allow admins to force-logout specific sessions.
- [ ] **API Key Management**: Allow tenants to create scoped API keys for M2M integrations. Support key rotation, expiry dates, and IP whitelisting. Rate limit per key.

### 3. Fleet Management at Scale

- [ ] **"God View" Dashboard**: Real-time map showing all tenant silo instances with status indicators. Drill-down to individual tenant metrics. Support filtering by region, status, version, and resource usage.
- [ ] **Centralized Log Aggregation**: Ship backend logs from all silo instances to a central location (ELK stack, Loki, or CloudWatch). Provide a log search UI in the hub dashboard.
- [ ] **Automated Silo Provisioning**: When a new enterprise tenant is created, automatically spin up a dedicated VM (via Lightsail API or Terraform), deploy the silo container, configure DNS, and register the heartbeat. Full infrastructure-as-code.
- [ ] **Rolling Updates**: Push module or platform updates to silos in batches with health-check gates. If a batch fails, halt the rollout and alert. Support version pinning per tenant.

### 4. Compliance & Governance

- [ ] **Audit Log Export**: Export audit logs to external systems (S3 as JSON/CSV, Splunk via HEC, or SIEM webhook). Add a scheduled export job configurable per tenant.
- [ ] **Data Residency Controls**: Allow tenants to specify their data region. Route database writes and backups to region-specific infrastructure. Tag all stored data with region metadata.
- [ ] **Retention Policies**: Configurable data retention periods per tenant. Auto-archive or delete data beyond the retention window. Required for GDPR and industry compliance.
- [ ] **Consent & Privacy Center**: A UI where end-users can view what data is stored about them, request export (GDPR Article 15), or request deletion (GDPR Article 17). Backed by an automated data discovery and purge pipeline.

### 5. Developer Ecosystem

- [ ] **Webhook System**: Allow tenants to register webhook URLs for platform events (tenant.created, user.invited, subscription.purchased, heartbeat.missed). Include HMAC signature verification, retry logic with exponential backoff, and a delivery log.
- [ ] **Public REST API with Versioning**: Version all API endpoints (`/api/v1/`, `/api/v2/`). Maintain backward compatibility for one major version. Publish a developer portal with interactive API reference, SDKs, and code samples.
- [ ] **Plugin Architecture**: Define a formal Plugin SDK that extends beyond modules. Plugins can register custom middleware, add UI panels (micro-frontends), and hook into lifecycle events. Publish an npm package (`@alyxnet/plugin-sdk`).
- [ ] **Marketplace for Third-Party Modules**: Open the module marketplace to external developers. Add a submission/review pipeline, revenue sharing model, and developer dashboard with analytics.

### 6. Global Performance

- [ ] **CDN Integration**: Serve the frontend via CloudFront (or Cloudflare). Configure cache headers, asset fingerprinting, and purge-on-deploy.
- [ ] **API Response Caching**: Add Redis as a caching layer for read-heavy endpoints (product listings, tenant metadata, fleet stats). Implement cache invalidation on writes.
- [ ] **Database Read Replicas**: For high-traffic hubs, configure MongoDB replica sets with read preference `secondaryPreferred` for analytics queries. Keep writes on primary.
- [ ] **Edge Functions**: Deploy latency-sensitive endpoints (health checks, static config) as edge functions (Cloudflare Workers or Lambda@Edge) to reduce round-trip time for global users.

---

## Phase 6: Platform Maturity & Operational Excellence

> **Status**: Long-Term
> The practices and systems that separate a startup product from a production-grade platform.

### 1. Observability Stack

- [ ] **Distributed Tracing**: Instrument backend with OpenTelemetry. Trace requests across hub-to-silo communication, database queries, and external API calls. Visualize in Jaeger or Grafana Tempo.
- [ ] **Metrics Pipeline**: Export application metrics (request latency, error rates, queue depth) to Prometheus. Build Grafana dashboards for SRE use. Set up alerting rules (PagerDuty/OpsGenie integration).
- [ ] **Structured Error Tracking**: Integrate Sentry (or self-hosted GlitchTip) for frontend and backend error tracking. Auto-create issues on new error types. Link errors to deployments for regression detection.
- [ ] **Uptime Monitoring**: External synthetic monitoring (Checkly, Uptime Robot) that hits `/api/health` from multiple regions. Publish a status page (`status.alyxnet.com`) showing real-time and historical uptime.

### 2. Testing & Quality Gates

- [ ] **Frontend Test Suite**: Write Vitest + React Testing Library tests for all pages and components. Target 80% coverage. Focus on: auth flows, CRUD operations, error states, permission-gated UI.
- [ ] **End-to-End Tests**: Add Playwright tests covering critical user journeys: registration, login, create tenant, purchase module, invite user, view dashboard. Run in CI on every PR.
- [ ] **Contract Testing**: Add Pact or similar contract tests between frontend and backend to catch API breaking changes before deployment.
- [ ] **Load Testing**: Add k6 or Artillery scripts that simulate concurrent users hitting auth, tenant CRUD, and heartbeat endpoints. Run before major releases. Establish baseline performance budgets.
- [ ] **Security Scanning**: Add `npm audit` and Snyk to CI pipeline. Run OWASP ZAP against the deployed staging environment weekly. Address critical/high findings within 48 hours.

### 3. Developer Experience

- [ ] **Local Development Setup**: Add a `docker-compose.dev.yml` with hot-reload for backend (nodemon), frontend (Vite HMR), and a local MongoDB. One command to start: `docker compose -f docker-compose.dev.yml up`.
- [ ] **Seed Data Script**: Create a `backend/scripts/seed.js` that populates the database with realistic test data: admin user, sample tenants, products, subscriptions, metrics history, and audit logs.
- [ ] **Module Scaffolding CLI**: Build a CLI tool (`npx alyxnet-create-module <name>`) that generates a new module from the `_template` directory with the correct boilerplate, registers it, and adds a basic test file.
- [ ] **Contributing Guide**: Document the module development workflow, coding conventions, PR process, and how to run tests locally.

### 4. Notification System

- [x] **Email Service Integration**: Integrated Resend as the transactional email provider (`support.alyxnet.com` domain verified). Created `services/email.js` with `sendInviteEmail()`, `sendPasswordResetEmail()`, `sendVerificationEmail()`. Inline HTML templates with styled button links. `sendAlertEmail()` deferred to Phase 3.
- [ ] **In-App Notification Persistence**: Currently notifications are in-memory and lost on page refresh. Add a `Notification` model (user, type, title, body, read, createdAt). Load unread count on login. Mark as read on click. Paginate in the notification center.
- [ ] **Notification Preferences**: Per-user settings: which events trigger email vs. in-app vs. both. Store in `GlobalUser.notificationPreferences`. Expose in the Settings page.
- [ ] **Webhook-Based Alerts**: For fleet monitoring alerts (tenant offline, high CPU, deployment failed), send notifications to configured webhook URLs (Slack, Discord, Teams, PagerDuty).

---

## Current Platform Statistics

| Metric                     | Value      |
| :------------------------- | :--------- |
| **Total Registered Users** | 0          |
| **Active Tenants**         | 0          |
| **Collected Metrics**      | 0          |
| **System Uptime**          | ~0h        |
| **Last Audit**             | 2026-02-15 |

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
