# Dockerfile to build and run Smart Poshan full-stack app on Railway
# Use a lightweight Node image
FROM node:18-alpine AS base
WORKDIR /app

# --- Build stage ---
FROM base AS builder
# Install build tools for both backend and frontend
COPY backend/backend.package.json backend/package.json
COPY backend/backend.package-lock.json backend/package-lock.json
COPY backend/backend.package.json backend/package.json
# Actually backend/package.json is at backend/package.json
# Copy frontend package files
COPY frontend/frontend.package.json frontend/package.json
COPY frontend/frontend.package-lock.json frontend/package-lock.json
# Copy shared files (if any)
COPY . .
# Install dependencies for backend and frontend
RUN cd backend && npm ci && cd ..
RUN cd frontend && npm ci && npm run build
# The Vite build outputs to frontend/dist
# Move built frontend assets to backend/public for serving static files
RUN mkdir -p backend/public && cp -R frontend/dist/* backend/public/

# --- Runtime stage ---
FROM base AS runtime
WORKDIR /app
# Copy only necessary runtime files
COPY --from=builder /app/backend ./backend
# Ensure SQLite DB is copied (you may want to use a volume for persistence)
COPY backend/database/poshan.db ./backend/database/poshan.db
# Expose the port (Railway sets PORT env var, default 5000)
EXPOSE ${PORT:-5000}
ENV NODE_ENV=production
# Start the server
CMD ["node", "backend/server.js"]
