# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY services/shared ./shared
WORKDIR /app/shared
RUN npm install
RUN npm run build

WORKDIR /app/frameworks
COPY services/frameworks/package*.json ./
RUN npm install

COPY services/frameworks ./
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy built frameworks service
COPY --from=builder /app/frameworks/dist ./dist
COPY --from=builder /app/frameworks/node_modules ./node_modules
COPY --from=builder /app/frameworks/package.json ./

# Copy built shared library to node_modules location where frameworks expects it
COPY --from=builder /app/shared/dist ./node_modules/@gigachad-grc/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@gigachad-grc/shared/
COPY --from=builder /app/shared/node_modules ./node_modules/@gigachad-grc/shared/node_modules

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "dist/main"]



