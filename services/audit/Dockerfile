# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared library first
COPY services/shared ./services/shared
WORKDIR /app/services/shared
RUN npm install && npm run build

# Copy audit service
WORKDIR /app
COPY services/audit/package*.json ./services/audit/
WORKDIR /app/services/audit
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=../shared/prisma/schema.prisma

# Copy source and build
COPY services/audit/src ./src
COPY services/audit/tsconfig.json ./
COPY services/audit/nest-cli.json ./
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/services/audit/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/services/audit/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/audit/package.json ./

USER nestjs

EXPOSE 3007

CMD ["node", "dist/main.js"]
