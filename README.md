# Alyxnet Frame - MERN Monorepo

A full-stack monorepo featuring a Webapp (Next.js), Desktop App (Electron), Mobile App (React Native/Expo), and a Backend (Express + MongoDB).

## Project Structure

```text
/
├── backend/       # Node.js Express server with MongoDB
├── webapp/        # Next.js web application (Shared codebase)
├── desktop/       # Electron wrapper for the webapp
├── mobile/        # React Native (Expo) mobile application
├── Dockerfile     # Monolithic container definition
└── package.json   # Root script manager
```

## Getting Started

### 1. Simultaneous Run (Recommended)
You can start the Backend, Webapp, and Desktop app all together from the root directory:

```bash
npm install
npm run dev
```

*This starts the Backend (5000), Webapp (3000), and launches the Electron application.*

---

### 2. Manual Run

If you need to run specific parts:

**Backend**
```bash
cd backend
npm install
node server.js
```

**Webapp (Development)**
```bash
cd webapp
npm install
npm run dev
```

**Desktop (Electron Development)**
```bash
cd desktop
npm install
npm start
```

**Mobile (Expo)**
```bash
cd mobile
npm install
npx expo start
```

---

### 3. Shared Codebase (Next.js + Electron)

The Desktop app uses the Webapp as its UI. For production, the Webapp is exported as a static site that Electron loads locally.

**Production Build:**
```bash
# 1. Build Webapp to static files
cd webapp
npm run build

# 2. Start Electron in production mode
cd ../desktop
NODE_ENV=production npm start
```

---

### 4. Docker & Production Deployment

The application is configured for automated deployment to **AWS Lightsail** using a monolithic Docker container.

#### **Local Docker Run**
```bash
# Build and run locally
docker compose up -d --build
```

#### **Production Deployment (AWS Lightsail)**

The deployment is automated via **GitHub Actions**.

**1. Infrastructure**
- **Platform**: AWS Lightsail (Ubuntu 22.04 LTS).
- **Public IP**: `13.232.95.78`
- **Orchestration**: Docker Compose with MongoDB volume persistence.

**2. CI/CD Pipeline**
Pushing to the `main` branch triggers the [.github/workflows/deploy.yml](.github/workflows/deploy.yml) workflow:
- Connects to the VM via SSH.
- Installs Docker automatically (if missing).
- Pulls the latest code.
- Rebuilds and restarts the container using `docker compose`.

**3. Required GitHub Secrets**
To maintain the pipeline, ensure the following secrets are set in your repository:
- `LIGHTSAIL_HOST`: `13.232.95.78`
- `LIGHTSAIL_USERNAME`: `ubuntu`
- `LIGHTSAIL_SSH_KEY`: Your private SSH key (`.pem` content).

## Environment Variables

- **Backend**: Uses `.env` for `PORT` and `MONGODB_URI`.
- **Webapp**: 
  - **Development**: Uses `.env.local` (Connects to `localhost:5000`).
  - **Production**: Uses `.env.production` (Connects to `http://13.232.95.78:5000`).
- **Docker**: Automatically connects to the internal `mongod` instance and persists data in the `mongodb_data` volume.

## Contributing

1.  Make sure Docker is running if you want to test the container.
2.  Ensure port 3000 and 5000 are free before running `npm run dev`.
