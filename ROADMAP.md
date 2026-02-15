# Project Roadmap: Alyxnet Frame

**Goal**: A robust, full-stack framework for delivering diverse customer solutions, featuring a multi-tenant architecture, cross-platform access (Web, Desktop, Mobile), and automated deployment.

---

## 🟢 Phase 1: Foundation & Core Infrastructure (Completed)

> **Status**: ✅ **100% Complete**
> The technological bedrock is solid. We have a working monorepo, deployment pipeline, and base functionality.

- [x] **Monorepo Structure**: Unified codebase for Backend, Frontend, Desktop, and Mobile.
- [x] **Containerization**: Single Docker container for Backend + Frontend + Database.
- [x] **CI/CD Pipeline**: Automated deployment to AWS Lightsail via GitHub Actions.
- [x] **Authentication & RBAC**: Secure login and role management.
- [x] **Core UI**: Dashboard, Tenant Management, and basic Marketplace UI.
- [x] **Cross-Platform**: Electron Desktop App and React Native Mobile scaffolding.

---

## 🟡 Phase 2: The Business Engine (Monetization & Operations)

> **Status**: 🚧 **In Progress**
> Turning the "framewok" into a "platform" that processes money and manages real customers.

### 1. Marketplace & Provisioning (The "App Store" Logic)

- [ ] **Provisioning Engine**: Automate the "install" process. When a user buys "CRM Module", appropriate flags/tables are enabled for that tenant.
- [ ] **Dependencies**: Logic to handle prerequisites (e.g., "Field Service" requires "Maps Integration").
- [ ] **Versioning**: Support rolling out module updates to specific tenants.

### 2. Commercialization Layer

- [ ] **Stripe Integration**: Automated subscription billing and invoicing.
- [ ] **Usage Metering**: Infrastructure to count API calls/storage for pay-as-you-go billing.
- [ ] **Data Isolation (Silo Mode)**: Logic to support "Enterprise" tenants who need a separate DB or schema.

### 3. Tenant Customization

- [ ] **White-Labeling**: Allow tenants to set their own logo, colors, and login domain (`start.mycompany.com`).

---

## 🟣 Phase 3: The AI & Modern Edge (Differentiation)

> **Status**: 💡 **Next Up**
> Features that make the platform "smart" and "alive", separating it from legacy competitors.

### 1. AI Revenue Agents (High Value Modules)

- [ ] **AI Sales Rep (SDR)**: Agent that connects to CRM to qualify leads and book meetings via email/LinkedIn.
- [ ] **Automated Consultant**: Agent that ingests client data to generate instant Audit Reports (SEO, Finance, Security).
- [ ] **Content Factory**: Agent that auto-generates localized marketing content for tenants.

### 2. Real-Time Interaction

- [ ] **Multiplayer Mode**: Live cursors and presence verification for team collaboration.
- [ ] **Contextual Collaboration**: "Comment anywhere" functionality on the dashboard.

### 3. Smart User Experience

- [ ] **Generative Analytics**: "Ask your data" interface (Text-to-SQL for tenant admins).
- [ ] **Smart Copilot**: Navigation assistant to help users find features or settings.

---

## 🔵 Phase 4: Vertical Solutions (Go-to-Market Strategy)

> **Status**: 💼 **Strategic Planning**
> Specific "Flavors" of the platform tailored to industry needs.

### 1. "Alyxnet Health" (Clinic Management)

- **Focus**: Privacy & Patient Engagement.
- **Key Modules**: EMR, Telemedicine (WebRTC), Appointment Scheduling.

### 2. "Alyxnet Retail" (POS & Inventory)

- **Focus**: Offline Reliability & Inventory.
- **Key Modules**: Barcode Scanning (Mobile), Offline Mode (WatermelonDB), Receipt Printing.

### 3. "Alyxnet Field" (Service & Logistics)

- **Focus**: Geo-location & Evidence.
- **Key Modules**: Job Dispatch, GPS Tracking, Signature Capture, Photo Upload.

---

## 🔴 Phase 5: Enterprise Scale (Long Term)

> **Status**: 📅 **Planned**
> Requirements for landing "Whale" clients (Fortune 500).

- [ ] **Fleet Management**: "God View" dashboard to monitor thousands of tenant instances.
- [ ] **Advanced Security**: SSO (SAML/OIDC), Audit Log Export (to Splunk/S3), 2FA enforcement.
- [ ] **Developer Ecosystem**: Webhooks and Plugin Architecture for 3rd party extensions.
- [ ] **Global Performance**: CDN integration and Edge caching strategies.

---

## 🛠 Ongoing: Technical Health & Maintenance

> **Status**: 🔄 **Continuous**
> Keeping the engine running smoothly.

- [ ] **Testing**: Increase Unit and E2E test coverage (Playwright/Jest).
- [ ] **Documentation**: Maintain API docs (Swagger) and User Guides.
- [ ] **Dependency Management**: Regular updates to React, Node, and Electron versions.
- [ ] **Mobile Polish**: Continuous improvement of the React Native UX to match native standards.
