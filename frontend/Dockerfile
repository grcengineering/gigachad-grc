# =============================================================================
# GigaChad GRC Frontend - Multi-stage Docker Build
# =============================================================================
# This Dockerfile builds the React frontend and serves it via Nginx.
# Build args are used to configure the frontend at build time.
# =============================================================================

# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package files from frontend directory (context is repo root)
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies) for build
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build-time environment variables
# These are baked into the static build
# Empty API URL means requests go to the same origin (nginx) which proxies them
ARG VITE_API_URL=
ARG VITE_ENABLE_AI_MODULE=true

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENABLE_AI_MODULE=$VITE_ENABLE_AI_MODULE
# SECURITY: Dev auth must be disabled for production builds
ENV VITE_ENABLE_DEV_AUTH=false

# Build in production mode for security and optimization
RUN npm run build -- --mode production

# Production stage - Nginx
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (path relative to context which is repo root)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Nginx runs on port 80 by default
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
