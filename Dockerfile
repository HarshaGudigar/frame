# Use Node.js as base
FROM node:20-bullseye

# Install MongoDB
RUN apt-get update && apt-get install -y gnupg wget
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
RUN apt-get update && apt-get install -y mongodb-org

# Create app directory
WORKDIR /app

# Create directory for MongoDB data
RUN mkdir -p /data/db

# Copy root package files
COPY package*.json ./

# Install root dependencies (concurrently)
RUN npm install

# Copy backend and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy webapp and install dependencies
COPY webapp/package*.json ./webapp/
RUN cd webapp && npm install

# Copy the rest of the application code
COPY . .

# Build Next.js app
RUN cd webapp && npm run build

# Expose ports
EXPOSE 3000 5000

# Start script to run Mongo, Backend, and Webapp
# We use 'serve' to host the static 'out' directory
CMD ["npx", "concurrently", \
    "\"mongod --bind_ip_all\"", \
    "\"npm run start --prefix backend\"", \
    "\"npx serve -s webapp/out -l 3000\""]

