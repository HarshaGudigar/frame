# Use Node.js as base
FROM node:20-bullseye

# Install MongoDB
RUN apt-get update && apt-get install -y gnupg wget
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
RUN apt-get update && apt-get install -y mongodb-org

# Create app directory
WORKDIR /app

# Create directory for MongoDB data and backups
RUN mkdir -p /data/db /backups

# Copy root package files
COPY package*.json ./

# Install root dependencies (production only — skip lint/format tools)
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps

# Copy backend and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --legacy-peer-deps

# Copy frontend and install dependencies (needs devDeps for build)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build Vite frontend for production
RUN cd frontend && npm run build

# Install 'serve' globally to host the static frontend
RUN npm install -g serve

# Expose ports: 3000 (frontend), 5000 (backend)
EXPOSE 3000 5000

# Health check — start-period=30s since monolithic container starts MongoDB too
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "const http=require('http');const r=http.get('http://127.0.0.1:5000/api/health',res=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1));r.end()"

# Start: clean stale MongoDB lock, then launch Mongo + Backend + Frontend
CMD ["sh", "-c", "rm -f /data/db/mongod.lock /data/db/WiredTiger.lock && npx concurrently \"mongod --bind_ip_all\" \"npm run start --prefix backend\" \"serve -s frontend/dist -l 3000\""]
