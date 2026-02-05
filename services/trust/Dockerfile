# Build stage - Using Docker Hardened Image
FROM node:25-alpine AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./shared

# Copy Trust service
WORKDIR /app/trust
COPY services/trust/package*.json ./

# Install without running postinstall
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy shared source and build it
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Build Trust service
WORKDIR /app/trust
COPY services/trust ./

# Replace the entire generator block in the schema to use absolute path
RUN head -3 ../shared/prisma/schema.prisma > /tmp/schema_header.prisma && \
    echo '' >> /tmp/schema_header.prisma && \
    echo 'generator client {' >> /tmp/schema_header.prisma && \
    echo '  provider      = "prisma-client-js"' >> /tmp/schema_header.prisma && \
    echo '  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-musl-openssl-3.0.x"]' >> /tmp/schema_header.prisma && \
    echo '  output        = "/app/trust/node_modules/.prisma/client"' >> /tmp/schema_header.prisma && \
    echo '}' >> /tmp/schema_header.prisma && \
    tail -n +9 ../shared/prisma/schema.prisma >> /tmp/schema_header.prisma && \
    mv /tmp/schema_header.prisma ../shared/prisma/schema.prisma

# Generate Prisma client
RUN npx prisma generate --schema=../shared/prisma/schema.prisma

# Build the service
RUN npm run build

# Production stage - Using Docker Hardened Image
FROM node:25-alpine AS production

# Install OpenSSL for Prisma
USER root
RUN apk add --no-cache openssl || true

WORKDIR /app

# Copy built Trust service
COPY --from=builder /app/trust/dist ./dist
COPY --from=builder /app/trust/node_modules ./node_modules
COPY --from=builder /app/trust/package.json ./

# Copy built shared library to node_modules location where Trust expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3006

ENV NODE_ENV=production
ENV PORT=3006

CMD ["node", "dist/main"]
