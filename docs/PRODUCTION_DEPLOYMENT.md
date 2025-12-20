# GigaChad GRC - Production Deployment Guide

This comprehensive guide covers everything you need to deploy GigaChad GRC to a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Backend Services Deployment](#backend-services-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Authentication Setup (Keycloak)](#authentication-setup-keycloak)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Checklist](#security-checklist)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Node.js | 18.0+ | Frontend build |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching & sessions |

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Domain & DNS

- Primary domain (e.g., `grc.yourcompany.com`)
- Wildcard SSL certificate or certificates for:
  - Main app: `grc.yourcompany.com`
  - API: `api.grc.yourcompany.com` (optional, can use path-based routing)
  - Auth: `auth.grc.yourcompany.com` (for Keycloak)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer / CDN                       │
│                    (Cloudflare, AWS ALB, etc.)                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Traefik Proxy                           │
│                    (SSL termination, routing)                   │
└─────────────────────────────────────────────────────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Frontend     │  │   API Services  │  │    Keycloak     │
│  (Nginx/Static) │  │   (NestJS x6)   │  │  (Auth Server)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐
          │   PostgreSQL    │  │      Redis      │
          │   (Database)    │  │    (Cache)      │
          └─────────────────┘  └─────────────────┘
```

### Microservices

| Service | Port | Purpose |
|---------|------|---------|
| Controls | 3001 | Controls, Evidence, Dashboard, Risks |
| Frameworks | 3002 | Frameworks, Assessments, Mappings |
| Policies | 3004 | Policies, Document Management |
| TPRM | 3005 | Vendors, Contracts |
| Trust | 3006 | Questionnaires, Trust Center |
| Audit | 3007 | Audits, Findings |

---

## Environment Configuration

### Production Environment File

Create `.env.production` in the project root:

```bash
# ===========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ===========================================

# Node Environment
NODE_ENV=production

# ===========================================
# Database Configuration
# ===========================================
DATABASE_URL=postgresql://grc_user:YOUR_SECURE_PASSWORD@postgres:5432/gigachad_grc
POSTGRES_USER=grc_user
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
POSTGRES_DB=gigachad_grc

# ===========================================
# Redis Configuration
# ===========================================
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# ===========================================
# Authentication (Keycloak)
# ===========================================
KEYCLOAK_URL=https://auth.yourcompany.com
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-backend
KEYCLOAK_CLIENT_SECRET=YOUR_KEYCLOAK_SECRET
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=YOUR_KEYCLOAK_ADMIN_PASSWORD

# ===========================================
# Object Storage (S3-compatible)
# ===========================================
STORAGE_PROVIDER=s3
S3_BUCKET=grc-files
S3_REGION=us-east-1
S3_ACCESS_KEY=YOUR_S3_ACCESS_KEY
S3_SECRET_KEY=YOUR_S3_SECRET_KEY
S3_ENDPOINT=https://s3.amazonaws.com
# For RustFS: S3_ENDPOINT=https://rustfs.yourcompany.com

# ===========================================
# Error Tracking (Sentry)
# ===========================================
SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2

# ===========================================
# Email Configuration
# ===========================================
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=notifications@yourcompany.com
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
SMTP_FROM=GigaChad GRC <notifications@yourcompany.com>

# ===========================================
# Application URLs
# ===========================================
APP_URL=https://grc.yourcompany.com
API_URL=https://grc.yourcompany.com/api

# ===========================================
# Security
# ===========================================
# Generate with: openssl rand -base64 32
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
ENCRYPTION_KEY=YOUR_GENERATED_ENCRYPTION_KEY

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# ===========================================
# Optional: AI Features
# ===========================================
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
AI_ENABLED=true
```

### Frontend Environment

Create `frontend/.env.production`:

```bash
# API Configuration
VITE_API_URL=https://grc.yourcompany.com

# Authentication
VITE_KEYCLOAK_URL=https://auth.yourcompany.com
VITE_KEYCLOAK_REALM=gigachad-grc
VITE_KEYCLOAK_CLIENT_ID=grc-frontend

# Error Tracking
VITE_ERROR_TRACKING_ENABLED=true
VITE_SENTRY_DSN=https://YOUR_FRONTEND_SENTRY_DSN@sentry.io/PROJECT_ID
VITE_APP_VERSION=${npm_package_version}

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_MCP_SERVERS=false
```

---

## Database Setup

### 1. Initialize PostgreSQL

```bash
# Run migrations in order
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/01-init.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/02-soft-delete-migration.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/03-database-enums.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/04-junction-tables.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/05-notification-configuration.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/10-employee-compliance.sql
psql -h your-db-host -U grc_user -d gigachad_grc -f database/init/11-performance-indexes.sql
```

### 2. Run Prisma Migrations

```bash
# From each service directory
cd services/controls && npx prisma migrate deploy
cd ../frameworks && npx prisma migrate deploy
cd ../policies && npx prisma migrate deploy
cd ../tprm && npx prisma migrate deploy
cd ../trust && npx prisma migrate deploy
cd ../audit && npx prisma migrate deploy
```

### 3. Database Backup Script

Save as `scripts/backup-database.sh`:

```bash
#!/bin/bash
# Production Database Backup Script

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gigachad_grc_${TIMESTAMP}.sql.gz"

# Create backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/postgres/

echo "Backup completed: $BACKUP_FILE"
```

---

## Backend Services Deployment

### Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: grc-traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourcompany.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - grc-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: grc-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - grc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: grc-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - grc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  controls:
    build:
      context: ./services/controls
      dockerfile: Dockerfile
    container_name: grc-controls
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - grc-network
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.controls.rule=Host(`grc.yourcompany.com`) && PathPrefix(`/api/controls`, `/api/evidence`, `/api/dashboard`, `/api/risks`)"
      - "traefik.http.routers.controls.tls.certresolver=letsencrypt"
      - "traefik.http.services.controls.loadbalancer.server.port=3001"

  # ... (similar configuration for other services)

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${APP_URL}
        - VITE_KEYCLOAK_URL=${KEYCLOAK_URL}
    container_name: grc-frontend
    networks:
      - grc-network
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`grc.yourcompany.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

networks:
  grc-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### Deployment Commands

```bash
# Pull latest images and rebuild
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build --no-cache

# Deploy with zero downtime
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Scale services
docker compose -f docker-compose.prod.yml up -d --scale controls=3
```

---

## Frontend Deployment

### Build for Production

```bash
cd frontend

# Install dependencies
npm ci --production=false

# Build
npm run build

# The build output is in ./dist
```

### Nginx Configuration

Create `frontend/nginx.prod.conf`:

```nginx
server {
    listen 80;
    server_name grc.yourcompany.com;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://rsms.me; connect-src 'self' https://api.grc.yourcompany.com wss://grc.yourcompany.com https://*.sentry.io;" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if not using separate domain)
    location /api/ {
        proxy_pass http://controls:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## Authentication Setup (Keycloak)

### 1. Import Realm Configuration

```bash
# Copy the realm export to Keycloak
docker cp auth/realm-export.json grc-keycloak:/tmp/

# Import via CLI
docker exec grc-keycloak /opt/keycloak/bin/kc.sh import --file /tmp/realm-export.json
```

### 2. Configure Production Settings

In Keycloak Admin Console (`https://auth.yourcompany.com`):

1. **Realm Settings > General**
   - Display name: GigaChad GRC
   - Enabled: ON
   - User registration: OFF (unless needed)

2. **Realm Settings > Login**
   - Require SSL: All requests
   - Remember Me: ON
   - Login timeout: 30 minutes

3. **Clients > grc-frontend**
   - Valid Redirect URIs: `https://grc.yourcompany.com/*`
   - Web Origins: `https://grc.yourcompany.com`
   - Access Type: public

4. **Clients > grc-backend**
   - Access Type: confidential
   - Service Accounts Enabled: ON

### 3. Create Initial Admin User

```bash
# Via Keycloak CLI
docker exec grc-keycloak /opt/keycloak/bin/kcadm.sh create users \
  -r gigachad-grc \
  -s username=admin@yourcompany.com \
  -s email=admin@yourcompany.com \
  -s enabled=true \
  -s firstName=Admin \
  -s lastName=User

# Set password
docker exec grc-keycloak /opt/keycloak/bin/kcadm.sh set-password \
  -r gigachad-grc \
  --username admin@yourcompany.com \
  --new-password "SECURE_PASSWORD"

# Assign admin role
docker exec grc-keycloak /opt/keycloak/bin/kcadm.sh add-roles \
  -r gigachad-grc \
  --uusername admin@yourcompany.com \
  --rolename admin
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Automatic)

Already configured in Traefik above. Certificates auto-renew.

### Option 2: Custom Certificate

```yaml
# In docker-compose.prod.yml, update traefik service:
traefik:
  volumes:
    - ./certs:/certs:ro
  command:
    - "--entrypoints.websecure.http.tls=true"
    - "--providers.file.directory=/certs"
    - "--providers.file.watch=true"
```

Create `certs/tls.yml`:

```yaml
tls:
  certificates:
    - certFile: /certs/grc.yourcompany.com.crt
      keyFile: /certs/grc.yourcompany.com.key
```

---

## Monitoring & Logging

### Sentry Error Tracking

1. Create a Sentry project at https://sentry.io
2. Get DSN from Project Settings > Client Keys
3. Set environment variables:

```bash
# Backend
SENTRY_DSN=https://xxx@sentry.io/123
SENTRY_ENVIRONMENT=production

# Frontend
VITE_SENTRY_DSN=https://yyy@sentry.io/456
VITE_ERROR_TRACKING_ENABLED=true
```

### Prometheus Metrics

Deploy the monitoring stack:

```bash
cd deploy/monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- AlertManager: http://localhost:9093

### Log Aggregation

Logs are shipped to Loki via Promtail. View in Grafana:
1. Add Loki as data source: http://loki:3100
2. Use LogQL to query: `{container_name="grc-controls"}`

---

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET: `openssl rand -base64 32`
- [ ] Generate new ENCRYPTION_KEY: `openssl rand -base64 32`
- [ ] Review and update CORS settings
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up WAF if available

### Post-Deployment

- [ ] Verify SSL/TLS configuration (https://ssllabs.com/ssltest)
- [ ] Test authentication flow
- [ ] Verify error tracking is working
- [ ] Run security scan (OWASP ZAP)
- [ ] Test backup and restore procedure
- [ ] Document recovery procedures

### Ongoing

- [ ] Regular dependency updates
- [ ] Monitor security advisories
- [ ] Review access logs
- [ ] Rotate secrets quarterly
- [ ] Penetration testing annually

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
docker exec grc-postgres pg_isready

# Check connection string
docker exec grc-controls env | grep DATABASE_URL

# Test connection
docker exec grc-controls npx prisma db pull
```

#### 2. Authentication Not Working

```bash
# Check Keycloak is accessible
curl -s https://auth.yourcompany.com/realms/gigachad-grc/.well-known/openid-configuration

# Check client configuration
# In Keycloak Admin > Clients > grc-frontend > Settings
# Verify Valid Redirect URIs and Web Origins
```

#### 3. API Requests Failing

```bash
# Check service health
curl -s https://grc.yourcompany.com/api/health

# Check Traefik routing
docker logs grc-traefik | grep error

# Check service logs
docker logs grc-controls --tail 100
```

#### 4. Performance Issues

```bash
# Check database performance
docker exec grc-postgres psql -U grc_user -d gigachad_grc -c "
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;"

# Check memory usage
docker stats

# Check Redis
docker exec grc-redis redis-cli -a $REDIS_PASSWORD INFO memory
```

### Log Locations

| Service | Container Log | Application Log |
|---------|--------------|-----------------|
| Controls | `docker logs grc-controls` | `/app/logs/` |
| Frontend | `docker logs grc-frontend` | Nginx access/error logs |
| Database | `docker logs grc-postgres` | PostgreSQL logs |
| Traefik | `docker logs grc-traefik` | Access logs |

---

## Maintenance & Updates

### Update Procedure

```bash
# 1. Backup database
./scripts/backup-database.sh

# 2. Pull latest code
git pull origin main

# 3. Build new images
docker compose -f docker-compose.prod.yml build --no-cache

# 4. Run migrations
docker exec grc-controls npx prisma migrate deploy

# 5. Deploy with minimal downtime
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 6. Verify health
curl -s https://grc.yourcompany.com/api/health

# 7. Monitor logs for errors
docker compose -f docker-compose.prod.yml logs -f --tail 100
```

### Rollback Procedure

```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml stop

# 2. Restore database from backup
./scripts/restore-database.sh /backups/postgres/latest.sql.gz

# 3. Checkout previous version
git checkout v1.x.x  # previous working version

# 4. Rebuild and deploy
docker compose -f docker-compose.prod.yml up -d --build

# 5. Verify rollback
curl -s https://grc.yourcompany.com/api/health
```

### Health Monitoring Script

Save as `scripts/health-check.sh`:

```bash
#!/bin/bash
# Production Health Check Script

ENDPOINTS=(
    "https://grc.yourcompany.com/api/health"
    "https://grc.yourcompany.com/api/controls/health"
    "https://auth.yourcompany.com/realms/gigachad-grc"
)

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

for endpoint in "${ENDPOINTS[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 10)
    
    if [ "$response" != "200" ]; then
        message="🚨 Health check failed for $endpoint (HTTP $response)"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK"
    fi
done
```

Add to crontab:
```bash
*/5 * * * * /path/to/scripts/health-check.sh
```

---

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `docker compose logs -f`
3. Check [GitHub Issues](https://github.com/grcengineering/gigachad-grc/issues)
4. Contact: support@yourcompany.com

---

*Last updated: December 2024*

