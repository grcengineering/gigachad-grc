# =============================================================================
# GigaChad GRC - Controls Service
# =============================================================================
# Multi-stage build with automatic database migration on startup.
# =============================================================================

# Build stage
FROM node:22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./shared

# Copy controls service
WORKDIR /app/controls
COPY services/controls/package*.json ./

# Install without running postinstall
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy shared source and build it. --ignore-scripts blocks postinstall
# hooks; the explicit `npx prisma generate` below replaces what the
# shared library's postinstall would have done. The repo .npmrc sets
# ignore-scripts=true but isn't COPY'd into the build context, so we
# pass the flag explicitly here.
WORKDIR /app/shared
RUN npm install --ignore-scripts --legacy-peer-deps
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

# Build each stdio MCP server as an independently installable runtime. The
# controls process launches these directories directly; they are not npm
# workspaces and therefore must carry their own production dependencies.
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app/mcp-servers/grc-evidence
COPY mcp-servers/grc-evidence/package*.json ./
RUN npm ci --ignore-scripts
COPY mcp-servers/grc-evidence/tsconfig.json ./
COPY mcp-servers/grc-evidence/src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

WORKDIR /app/mcp-servers/grc-compliance
COPY mcp-servers/grc-compliance/package*.json ./
RUN npm ci --ignore-scripts
COPY mcp-servers/grc-compliance/tsconfig.json ./
COPY mcp-servers/grc-compliance/src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

WORKDIR /app/mcp-servers/grc-ai-assistant
COPY mcp-servers/grc-ai-assistant/package*.json ./
RUN npm ci --ignore-scripts
COPY mcp-servers/grc-ai-assistant/tsconfig.json ./
COPY mcp-servers/grc-ai-assistant/src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

# Production stage
FROM node:22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS production

# Patch OS-level CVEs, install OpenSSL for Prisma and Chromium for the evidence
# screenshot tool, then remove npm (the packaged MCP servers execute with node).
RUN apk upgrade --no-cache && \
    apk add --no-cache "openssl>=3.5.8-r0" libcrypto3 libssl3 chromium nss freetype harfbuzz ca-certificates && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

# Copy built controls service
COPY --from=builder /app/controls/dist ./dist
COPY --from=builder /app/controls/node_modules ./node_modules
COPY --from=builder /app/controls/package.json ./

# Copy built shared library to node_modules location where controls expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

# Copy the built MCP servers and their isolated production dependencies.
COPY --from=builder /app/mcp-servers/grc-evidence/package.json ./mcp-servers/grc-evidence/
COPY --from=builder /app/mcp-servers/grc-evidence/dist ./mcp-servers/grc-evidence/dist
COPY --from=builder /app/mcp-servers/grc-evidence/node_modules ./mcp-servers/grc-evidence/node_modules
COPY --from=builder /app/mcp-servers/grc-compliance/package.json ./mcp-servers/grc-compliance/
COPY --from=builder /app/mcp-servers/grc-compliance/dist ./mcp-servers/grc-compliance/dist
COPY --from=builder /app/mcp-servers/grc-compliance/node_modules ./mcp-servers/grc-compliance/node_modules
COPY --from=builder /app/mcp-servers/grc-ai-assistant/package.json ./mcp-servers/grc-ai-assistant/
COPY --from=builder /app/mcp-servers/grc-ai-assistant/dist ./mcp-servers/grc-ai-assistant/dist
COPY --from=builder /app/mcp-servers/grc-ai-assistant/node_modules ./mcp-servers/grc-ai-assistant/node_modules

# Copy Prisma schema for migrations
COPY --from=builder /app/shared/prisma ./shared/prisma

# Copy the idempotent post-Prisma BC/DR migration
COPY database/init/12-bcdr-module.sql ./database/migrations/12-bcdr-module.sql

# Copy the safe baseline/deploy wrapper used by the controls entrypoint.
COPY deploy/prisma-migrate-safe.sh ./deploy/prisma-migrate-safe.sh

# Copy entrypoint script
COPY services/controls/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh /app/deploy/prisma-migrate-safe.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV MCP_SERVERS_ROOT=/app/mcp-servers
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Use entrypoint for auto-migration
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
