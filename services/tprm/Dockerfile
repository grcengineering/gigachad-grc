# Build stage - Using Docker Hardened Image
FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./shared

# Copy TPRM service
WORKDIR /app/tprm
COPY services/tprm/package*.json ./

# Install without running postinstall
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy shared source and build it
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Build TPRM service
WORKDIR /app/tprm
COPY services/tprm ./

# Replace the entire generator block in the schema to use absolute path
RUN head -3 ../shared/prisma/schema.prisma > /tmp/schema_header.prisma && \
    echo '' >> /tmp/schema_header.prisma && \
    echo 'generator client {' >> /tmp/schema_header.prisma && \
    echo '  provider      = "prisma-client-js"' >> /tmp/schema_header.prisma && \
    echo '  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-musl-openssl-3.0.x"]' >> /tmp/schema_header.prisma && \
    echo '  output        = "/app/tprm/node_modules/.prisma/client"' >> /tmp/schema_header.prisma && \
    echo '}' >> /tmp/schema_header.prisma && \
    tail -n +9 ../shared/prisma/schema.prisma >> /tmp/schema_header.prisma && \
    mv /tmp/schema_header.prisma ../shared/prisma/schema.prisma

# Generate Prisma client
RUN npx prisma generate --schema=../shared/prisma/schema.prisma

# Build the service
RUN npm run build

# Production stage - Using Docker Hardened Image
FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS production

# Patch OS-level CVEs, install OpenSSL for Prisma, remove npm (not needed at runtime)
USER root
RUN apk upgrade --no-cache && apk add --no-cache openssl && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

# Copy built TPRM service
COPY --from=builder /app/tprm/dist ./dist
COPY --from=builder /app/tprm/node_modules ./node_modules
COPY --from=builder /app/tprm/package.json ./

# Copy built shared library to node_modules location where TPRM expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3005

ENV NODE_ENV=production
ENV PORT=3005

CMD ["node", "dist/main"]
