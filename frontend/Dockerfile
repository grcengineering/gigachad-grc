# =============================================================================
# GigaChad GRC Frontend - Multi-stage Docker Build
# =============================================================================
# This Dockerfile builds the React frontend and serves it via Nginx.
# Build args are used to configure the frontend at build time.
# =============================================================================

# Build stage
FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS builder

WORKDIR /app

# Copy package files from frontend directory (context is repo root)
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies) for build.
# --ignore-scripts blocks postinstall hooks, the main supply-chain attack
# vector via npm. The repo .npmrc sets ignore-scripts=true but isn't
# COPY'd into the build context, so we pass the flag explicitly here.
RUN npm install --ignore-scripts

# Copy frontend source
COPY frontend/ ./

# Build-time environment variables
# These are baked into the static build
# Empty API URL means requests go to the same origin (nginx) which proxies them
ARG VITE_API_URL=
ARG VITE_ENABLE_AI_MODULE=true
ARG VITE_ENABLE_DEV_AUTH=false
# Double opt-in for the dev-auth bypass. Setting VITE_ENABLE_DEV_AUTH=true
# alone is not enough; you must also pass ALLOW_DEV_AUTH=true. This
# prevents a misconfigured CI variable from silently baking the
# Keycloak-bypassing dev-login UI into a production image.
ARG ALLOW_DEV_AUTH=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENABLE_AI_MODULE=$VITE_ENABLE_AI_MODULE
# SECURITY: Dev auth defaults to false; set via build arg for dev/demo
ENV VITE_ENABLE_DEV_AUTH=$VITE_ENABLE_DEV_AUTH

# Fail the build if dev-auth is requested without the explicit opt-in.
RUN if [ "$VITE_ENABLE_DEV_AUTH" = "true" ] && [ "$ALLOW_DEV_AUTH" != "true" ]; then \
      echo "ERROR: VITE_ENABLE_DEV_AUTH=true requires also passing --build-arg ALLOW_DEV_AUTH=true." >&2; \
      echo "Dev-auth bakes a Keycloak-bypassing login button into the static build. Refusing." >&2; \
      exit 1; \
    fi

# Limit Node.js heap to prevent OOM kills during parallel Docker builds
ENV NODE_OPTIONS=--max-old-space-size=2048

# Build: use development mode when dev-auth is enabled so
# the vite security guard does not block the build.
RUN if [ "$VITE_ENABLE_DEV_AUTH" = "true" ]; then \
      npm run build -- --mode development; \
    else \
      npm run build -- --mode production; \
    fi

# Production stage - Nginx
FROM nginx:alpine@sha256:1d13701a5f9f3fb01aaa88cef2344d65b6b5bf6b7d9fa4cf0dca557a8d7702ba AS production

# Patch OS-level CVEs (zlib CVE-2026-22184, CVE-2026-27171)
RUN apk upgrade --no-cache

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
