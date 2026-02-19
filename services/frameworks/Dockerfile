# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./shared

# Copy frameworks service
WORKDIR /app/frameworks
COPY services/frameworks/package*.json ./

# Install without running postinstall
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy shared source and build it
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Build frameworks service
WORKDIR /app/frameworks
COPY services/frameworks ./

# Replace the entire generator block in the schema to use absolute path
RUN head -3 ../shared/prisma/schema.prisma > /tmp/schema_header.prisma && \
    echo '' >> /tmp/schema_header.prisma && \
    echo 'generator client {' >> /tmp/schema_header.prisma && \
    echo '  provider      = "prisma-client-js"' >> /tmp/schema_header.prisma && \
    echo '  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-musl-openssl-3.0.x"]' >> /tmp/schema_header.prisma && \
    echo '  output        = "/app/frameworks/node_modules/.prisma/client"' >> /tmp/schema_header.prisma && \
    echo '}' >> /tmp/schema_header.prisma && \
    tail -n +9 ../shared/prisma/schema.prisma >> /tmp/schema_header.prisma && \
    mv /tmp/schema_header.prisma ../shared/prisma/schema.prisma

# Generate Prisma client
RUN npx prisma generate --schema=../shared/prisma/schema.prisma

# Build the service
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma and patch npm's bundled tar (CVE-2026-26960)
RUN apk add --no-cache openssl && npm update -g npm

WORKDIR /app

# Copy built frameworks service
COPY --from=builder /app/frameworks/dist ./dist
COPY --from=builder /app/frameworks/node_modules ./node_modules
COPY --from=builder /app/frameworks/package.json ./

# Copy built shared library to node_modules location where frameworks expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "dist/main"]
