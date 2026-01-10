# Deployment Guide

This guide covers deploying the GigaChad GRC platform in various environments.

## Table of Contents

1. [Supabase + Vercel (Recommended)](#supabase--vercel-recommended)
2. [Docker Compose (Development)](#docker-compose-development)
3. [Docker Compose (Production)](#docker-compose-production)
4. [Kubernetes](#kubernetes)
5. [Module Extraction](#module-extraction)

---

## Supabase + Vercel (Recommended)

The simplest and most cost-effective deployment option uses Supabase for database/storage and Vercel for hosting.

**Estimated Monthly Cost**: ~$45/month (Vercel Pro $20 + Supabase Pro $25)

### Quick Start

1. Create a [Supabase](https://supabase.com) project
2. Configure [Okta](https://okta.com) application for SSO
3. Deploy to [Vercel](https://vercel.com)
4. Set environment variables
5. Run database migrations

### Detailed Guide

For complete step-by-step instructions, see:
- **[Supabase + Vercel Migration Guide](deployment/supabase-vercel-migration.md)** - Full technical documentation
- **[Cloud Deployment Guide](help/deployment/cloud-deployment.md)** - User-friendly overview

### Required Environment Variables

```
VITE_OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
VITE_OKTA_CLIENT_ID=your-client-id
DATABASE_URL=postgres://...pooler.supabase.com:6543/postgres
DIRECT_URL=postgres://...supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
ENCRYPTION_KEY=your-32-byte-hex-key
```

---

## Docker Compose (Development)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 8GB RAM minimum
- 20GB disk space

### Steps

1. Clone and configure:
```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
cp env.example .env
```

2. Start services:
```bash
docker-compose up -d
```

3. Initialize database:
```bash
# Wait for services to be healthy
docker-compose ps

# Run migrations
docker-compose exec controls npx prisma migrate deploy

# Seed frameworks data
docker-compose exec frameworks npm run seed
```

4. Access services:
- Frontend: http://localhost:3000
- Keycloak: http://localhost:8080
- Traefik Dashboard: http://localhost:8090

## Docker Compose (Production)

### Security Hardening

1. Update environment variables:
```bash
# Generate strong passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

2. Create production compose file:
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  traefik:
    image: docker.io/dockerhardened/traefik:3
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/etc/traefik/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/etc/traefik
    networks:
      - grc-network
    restart: always

  postgres:
    image: docker.io/dockerhardened/postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - grc-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ... other services with production configs

volumes:
  traefik_certs:
  postgres_data:
  redis_data:
  rustfs_data:

networks:
  grc-network:
    driver: bridge
```

3. Deploy:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### TLS Configuration

Add to Traefik labels for each service:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myservice.rule=Host(`api.yourdomain.com`)"
  - "traefik.http.routers.myservice.entrypoints=websecure"
  - "traefik.http.routers.myservice.tls.certresolver=letsencrypt"
```

### Backup Strategy

```bash
# Database backup
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql

# RustFS backup (sync to external S3)
# Use standard S3 tools or docker cp
docker cp grc-rustfs:/data ./rustfs-backup/

# Full volume backup
docker run --rm -v gigachad-grc_postgres_data:/data -v $(pwd):/backup alpine tar cvf /backup/postgres-backup.tar /data
```

## Kubernetes

### Helm Chart Structure

```
helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment-controls.yaml
│   ├── deployment-frameworks.yaml
│   ├── deployment-frontend.yaml
│   ├── service-controls.yaml
│   ├── service-frameworks.yaml
│   ├── service-frontend.yaml
│   ├── ingress.yaml
│   └── pvc.yaml
```

### Sample values.yaml

```yaml
# values.yaml
replicaCount: 2

image:
  repository: your-registry/gigachad-grc
  tag: latest
  pullPolicy: Always

database:
  host: postgres.default.svc.cluster.local
  port: 5432
  name: gigachad_grc

redis:
  host: redis.default.svc.cluster.local
  port: 6379

keycloak:
  url: https://auth.yourdomain.com
  realm: gigachad-grc
  clientId: grc-frontend

rustfs:
  endpoint: rustfs.default.svc.cluster.local
  port: 9000
  bucket: grc-evidence

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: grc.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: grc-tls
      hosts:
        - grc.yourdomain.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace gigachad-grc

# Create secrets
kubectl create secret generic grc-secrets \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  -n gigachad-grc

# Install with Helm
helm install gigachad-grc ./helm -n gigachad-grc -f values.yaml
```

## Module Extraction

Each service can be deployed independently.

### Extract Controls Service

1. Copy necessary files:
```bash
mkdir my-controls-service
cp -r services/controls/* my-controls-service/
cp -r services/shared my-controls-service/
cp services/shared/prisma/schema.prisma my-controls-service/prisma/
```

2. Update Dockerfile:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy shared library
COPY shared ./shared
WORKDIR /app/shared
RUN npm install && npm run build

# Copy service
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main"]
```

3. Configure environment:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
KEYCLOAK_URL=https://auth.yourdomain.com
STORAGE_TYPE=s3
MINIO_ENDPOINT=storage.yourdomain.com
```

4. Build and run:
```bash
docker build -t my-controls-service .
docker run -p 3001:3001 --env-file .env my-controls-service
```

### Standalone Database

For standalone modules, you can use a subset of the schema:

```bash
# Generate migration for controls tables only
npx prisma migrate dev --name controls-init --schema=./prisma/schema-controls.prisma
```

## Monitoring

### Health Checks

Each service exposes health endpoints:
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness (includes DB connection)

### Prometheus Metrics

Add to each service:
```typescript
// main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register(),
  ],
})
```

### Logging

Configure structured logging:
```typescript
// Use the shared logger
import { getLogger } from '@gigachad-grc/shared';

const logger = getLogger('controls');
logger.info('Service started', { port: 3001 });
```

## Troubleshooting

### Common Issues

**Database connection failed:**
```bash
# Check if postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U grc -d gigachad_grc
```

**Keycloak not redirecting:**
```bash
# Check Keycloak realm configuration
# Ensure redirect URIs match your frontend URL
```

**RustFS/S3 access denied:**
```bash
# Verify RustFS is running
docker-compose ps rustfs

# Access the RustFS console to manage buckets
# http://localhost:9001 (rustfsadmin/rustfsadmin)

# Or use AWS CLI with S3 endpoint
aws --endpoint-url http://localhost:9000 s3 ls
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f controls

# View last 100 lines
docker-compose logs --tail=100 controls
```

### Reset Environment

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```



