# =============================================================================
# GigaChad GRC - Controls Service
# =============================================================================
# Multi-stage build with automatic database migration on startup.
# =============================================================================

# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./shared

# Copy controls service
WORKDIR /app/controls
COPY services/controls/package*.json ./

# Install without running postinstall
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy shared source and build it
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Build controls service
WORKDIR /app/controls
COPY services/controls ./

# Replace the entire generator block in the schema to use absolute path
RUN head -3 ../shared/prisma/schema.prisma > /tmp/schema_header.prisma && \
    echo '' >> /tmp/schema_header.prisma && \
    echo 'generator client {' >> /tmp/schema_header.prisma && \
    echo '  provider      = "prisma-client-js"' >> /tmp/schema_header.prisma && \
    echo '  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-musl-openssl-3.0.x"]' >> /tmp/schema_header.prisma && \
    echo '  output        = "/app/controls/node_modules/.prisma/client"' >> /tmp/schema_header.prisma && \
    echo '}' >> /tmp/schema_header.prisma && \
    tail -n +9 ../shared/prisma/schema.prisma >> /tmp/schema_header.prisma && \
    mv /tmp/schema_header.prisma ../shared/prisma/schema.prisma

# Verify the schema was modified correctly
RUN head -15 ../shared/prisma/schema.prisma

# Generate Prisma client
RUN npx prisma generate --schema=../shared/prisma/schema.prisma

# Verify Prisma client was generated
RUN ls -la node_modules/.prisma/client/ 2>/dev/null | head -5 || echo "Checking /app/controls/node_modules/.prisma/client/" && ls -la /app/controls/node_modules/.prisma/client/ | head -5

# Build the service
RUN npm run build

# Production stage
FROM node:25-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy built controls service
COPY --from=builder /app/controls/dist ./dist
COPY --from=builder /app/controls/node_modules ./node_modules
COPY --from=builder /app/controls/package.json ./

# Copy built shared library to node_modules location where controls expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

# Copy Prisma schema for migrations
COPY --from=builder /app/shared/prisma ./shared/prisma

# Copy entrypoint script
COPY services/controls/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Use entrypoint for auto-migration
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
