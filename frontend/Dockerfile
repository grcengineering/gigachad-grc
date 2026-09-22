# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Compose and CI build with repository root as context.
# Copy frontend-specific files explicitly so this Dockerfile resolves paths correctly.
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

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

# Copy built assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]



