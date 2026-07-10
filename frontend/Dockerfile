# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Compose and CI build with repository root as context.
# Copy frontend-specific files explicitly so this Dockerfile resolves paths correctly.
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]



