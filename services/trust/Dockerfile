# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared library
COPY services/shared ./shared
WORKDIR /app/shared
RUN npm install
RUN npm run build

# Copy Trust service
WORKDIR /app/trust
COPY services/trust/package*.json ./
RUN npm install

COPY services/trust ./
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy built Trust service first
COPY --from=builder /app/trust/dist ./dist
COPY --from=builder /app/trust/node_modules ./node_modules
COPY --from=builder /app/trust/package.json ./

# Copy built shared library to node_modules location where Trust expects it (overwrites symlink)
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
