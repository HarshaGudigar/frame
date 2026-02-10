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

### 4. Docker (All-in-One Container)

You can run the entire Backend, Webapp, and an internal MongoDB instance in a single container.

**Build and Run:**
```bash
# Build the image
docker build -t mern-monolith .

# Run the container
docker run --name mern-app -d -p 3000:3000 -p 5000:5000 mern-monolith
```

*The Webapp will be accessible at http://localhost:3000.*

## Environment Variables

- **Backend**: Uses `.env` for `PORT` and `MONGODB_URI`.
- **Webapp**: Connects to `http://localhost:5000` for API data.
- **Docker**: Automatically connects to the internal `mongod` instance.

## Contributing

1.  Make sure Docker is running if you want to test the container.
2.  Ensure port 3000 and 5000 are free before running `npm run dev`.
