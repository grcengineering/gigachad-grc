# Deployment Guide

This guide covers deploying the GigaChad GRC platform in various environments.

## Table of Contents

1. [Docker Compose (Development)](#docker-compose-development)
2. [Docker Compose (Production)](#docker-compose-production)
3. [Kubernetes](#kubernetes)
4. [Module Extraction](#module-extraction)

## Docker Compose (Development)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 8GB RAM minimum
- 20GB disk space

### Steps

1. Clone and configure:
```bash
git clone https://github.com/your-org/gigachad-grc.git
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
  minio_data:

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

# MinIO backup (sync to external S3)
docker-compose exec minio mc mirror /data s3/backup-bucket

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

minio:
  endpoint: minio.default.svc.cluster.local
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
STORAGE_TYPE=minio
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

**MinIO access denied:**
```bash
# Verify bucket exists
docker-compose exec minio mc ls minio/grc-evidence

# Create bucket if needed
docker-compose exec minio mc mb minio/grc-evidence
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



