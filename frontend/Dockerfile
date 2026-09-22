# Build stage
FROM node:22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS builder

WORKDIR /app

# The frontend is an npm workspace. Install it from the repository lockfile so
# local, CI, Dependabot, and container builds all resolve the same dependency
# graph. Workspace manifests must exist before npm ci evaluates the root graph.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY services/shared/package.json ./services/shared/package.json
COPY services/controls/package.json ./services/controls/package.json
COPY services/frameworks/package.json ./services/frameworks/package.json
COPY services/policies/package.json ./services/policies/package.json
COPY services/tprm/package.json ./services/tprm/package.json
COPY services/trust/package.json ./services/trust/package.json
COPY services/audit/package.json ./services/audit/package.json
RUN npm ci --ignore-scripts --workspace @gigachad-grc/frontend --include-workspace-root

COPY frontend/ ./frontend/
WORKDIR /app/frontend

# Vite inlines VITE_-prefixed vars into the bundle at build time, so this
# must be a build ARG (not a runtime `environment:` entry) to have any
# effect. Defaults to false so a plain `docker build` (no --build-arg)
# never ships the dev-auth bypass.
ARG VITE_ENABLE_DEV_AUTH=false
ARG VITE_KEYCLOAK_URL
ENV VITE_ENABLE_DEV_AUTH=$VITE_ENABLE_DEV_AUTH
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Apply current Alpine security fixes instead of shipping the packages baked
# into the base image digest.
RUN apk upgrade --no-cache

# Copy built assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]



