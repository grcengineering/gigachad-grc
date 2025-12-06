# GigaChad GRC - Production Deployment Guide

This guide provides comprehensive instructions for deploying GigaChad GRC in a production environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Requirements](#server-requirements)
- [Installation](#installation)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Backup & Recovery](#backup--recovery)
- [Monitoring & Logging](#monitoring--logging)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### Required Software

- **Operating System**: Ubuntu 22.04 LTS or later (recommended)
- **Docker**: Version 24.0 or later
- **Docker Compose**: Version 2.20 or later
- **Git**: Version 2.30 or later
- **OpenSSL**: For generating secrets

### Server Requirements

#### Minimum Requirements

- **CPU**: 4 cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps

#### Recommended Requirements (Production)

- **CPU**: 8+ cores
- **RAM**: 32 GB+
- **Storage**: 500 GB SSD (NVMe preferred)
- **Network**: 1 Gbps
- **Backup Storage**: Additional 500 GB for backups

### Domain & DNS

- A registered domain name
- DNS A records configured:
  - `grc.example.com` → Server IP
  - `auth.grc.example.com` → Server IP
  - `storage.grc.example.com` → Server IP
  - `console.storage.grc.example.com` → Server IP

### Firewall Configuration

Open the following ports:

```bash
# HTTP (will redirect to HTTPS)
sudo ufw allow 80/tcp

# HTTPS
sudo ufw allow 443/tcp

# SSH (for remote management)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Installation

### Step 1: Install Docker

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to the docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Clone the repository
cd /opt
sudo git clone https://github.com/yourusername/gigachad-grc.git
sudo chown -R $USER:$USER gigachad-grc
cd gigachad-grc

# Checkout production branch or tag
git checkout v1.0.0  # or your desired version
```

### Step 3: Configure Environment

```bash
# Copy production environment template
cp .env.example.prod .env.prod

# Generate secure secrets
openssl rand -base64 64 > /tmp/jwt_secret
openssl rand -base64 64 > /tmp/session_secret
openssl rand -hex 32 > /tmp/encryption_key
openssl rand -base64 32 > /tmp/postgres_password
openssl rand -base64 32 > /tmp/redis_password
openssl rand -base64 32 > /tmp/keycloak_password
openssl rand -base64 20 > /tmp/minio_password

# Edit .env.prod with your actual values
nano .env.prod

# Set secure permissions
chmod 600 .env.prod

# Never commit this file!
echo ".env.prod" >> .gitignore
```

### Step 4: Update Configuration Values

Edit `.env.prod` and update the following critical values:

```bash
# Domain configuration
APP_DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com
KEYCLOAK_HOSTNAME=auth.your-domain.com

# Database password (use generated value)
POSTGRES_PASSWORD=$(cat /tmp/postgres_password)

# Redis password (use generated value)
REDIS_PASSWORD=$(cat /tmp/redis_password)

# Keycloak admin password (use generated value)
KEYCLOAK_ADMIN_PASSWORD=$(cat /tmp/keycloak_password)

# MinIO credentials (use generated value)
MINIO_ROOT_PASSWORD=$(cat /tmp/minio_password)

# JWT & Session secrets (use generated values)
JWT_SECRET=$(cat /tmp/jwt_secret)
SESSION_SECRET=$(cat /tmp/session_secret)
ENCRYPTION_KEY=$(cat /tmp/encryption_key)

# SMTP configuration (if using email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## SSL/TLS Configuration

### Automatic SSL with Let's Encrypt (Recommended)

The docker-compose configuration automatically handles SSL certificate generation using Let's Encrypt.

**Requirements:**
- Domain must be publicly accessible
- DNS A records must point to your server
- Ports 80 and 443 must be open

The certificates will be automatically:
- Generated on first startup
- Renewed automatically before expiration
- Stored in the `traefik_letsencrypt` Docker volume

### Manual SSL Certificate Installation

If you have your own SSL certificates:

1. Create a directory for certificates:

```bash
mkdir -p /opt/gigachad-grc/certs
chmod 700 /opt/gigachad-grc/certs
```

2. Copy your certificates:

```bash
# Copy certificate files
cp your-domain.crt /opt/gigachad-grc/certs/server.crt
cp your-domain.key /opt/gigachad-grc/certs/server.key

# Set permissions
chmod 600 /opt/gigachad-grc/certs/*
```

3. Update `docker-compose.prod.yml` to mount certificates:

```yaml
traefik:
  volumes:
    - ./certs:/certs:ro
```

## Deployment

### Build and Start Services

```bash
# Navigate to project directory
cd /opt/gigachad-grc

# Pull the latest images
docker compose -f docker-compose.prod.yml --env-file .env.prod pull

# Build custom service images
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Initial Database Setup

```bash
# Wait for PostgreSQL to be ready
docker compose -f docker-compose.prod.yml --env-file .env.prod exec postgres pg_isready -U grc_prod_user

# Run database migrations
docker compose -f docker-compose.prod.yml --env-file .env.prod exec controls npm run migrate

# Create initial admin user (if applicable)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec controls npm run seed:admin
```

### Configure Keycloak

1. Access Keycloak admin console:
   - URL: `https://auth.your-domain.com`
   - Username: Value from `KEYCLOAK_ADMIN`
   - Password: Value from `KEYCLOAK_ADMIN_PASSWORD`

2. Create a new realm (if not imported):
   - Name: `grc`
   - Display name: `GigaChad GRC`

3. Configure realm settings:
   - Go to Realm Settings > General
   - Set frontend URL: `https://auth.your-domain.com/auth`
   - Enable required features

4. Create clients for each service

5. Set up user federation (LDAP/Active Directory) if needed

### Configure MinIO

1. Access MinIO console:
   - URL: `https://console.storage.your-domain.com`
   - Username: Value from `MINIO_ROOT_USER`
   - Password: Value from `MINIO_ROOT_PASSWORD`

2. Create buckets:
   - `grc-evidence-prod`
   - `grc-backups-prod`

3. Set bucket policies:
   - Private by default
   - Configure access policies as needed

4. Create access keys for applications

## Backup & Recovery

### Automated Backups

Backups are automatically performed using the included backup script.

#### Configure Backup Schedule

```bash
# Edit crontab
crontab -e

# Add backup schedule (daily at 2 AM)
0 2 * * * /opt/gigachad-grc/deploy/backup.sh >> /var/log/grc-backup.log 2>&1
```

#### Manual Backup

```bash
# Run backup script
cd /opt/gigachad-grc/deploy
./backup.sh
```

Backup includes:
- PostgreSQL database dump
- MinIO/S3 files
- Configuration files
- Docker volumes

Backups are stored in:
- Local: `/backups/gigachad-grc/`
- Retention: 30 days (configurable)

### Disaster Recovery

To restore from backup:

```bash
# Stop all services
cd /opt/gigachad-grc
docker compose -f docker-compose.prod.yml down

# Restore from backup
cd deploy
./restore.sh /backups/gigachad-grc/backup-YYYY-MM-DD-HHMMSS.tar.gz

# Start services
cd ..
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify restoration
docker compose -f docker-compose.prod.yml logs -f
```

### Backup to Remote Storage

Configure remote backup in `.env.prod`:

```bash
DR_REMOTE_BACKUP_ENABLED=true
DR_REMOTE_BACKUP_S3_BUCKET=grc-backups-remote
DR_REMOTE_BACKUP_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Monitoring & Logging

### Health Checks

Check service health:

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check specific service health
docker compose -f docker-compose.prod.yml exec controls wget -O - http://localhost:3001/health

# View health check logs
docker inspect --format='{{json .State.Health}}' grc-postgres | jq
```

### Log Management

View logs:

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f controls

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Follow logs with timestamps
docker compose -f docker-compose.prod.yml logs -f -t
```

Log rotation is configured automatically:
- Max size: 10MB per file
- Max files: 3 (30MB total per service)

### Metrics & Monitoring

Configure external monitoring (recommended):

1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization
3. **AlertManager** - Alerting
4. **ELK Stack** - Log aggregation

Example Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'grc-services'
    static_configs:
      - targets:
        - 'grc.example.com:9090'
```

### Application Performance Monitoring (APM)

Configure Sentry in `.env.prod`:

```bash
SENTRY_ENABLED=true
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Maintenance

### Updating the Application

```bash
# Backup before updating
./deploy/backup.sh

# Pull latest code
cd /opt/gigachad-grc
git fetch
git checkout v1.1.0  # or desired version

# Pull latest images
docker compose -f docker-compose.prod.yml --env-file .env.prod pull

# Rebuild custom images
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# Stop services (rolling update)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --build controls

# Verify the update
docker compose -f docker-compose.prod.yml logs -f controls

# Update remaining services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Database Maintenance

```bash
# Vacuum database
docker compose -f docker-compose.prod.yml exec postgres vacuumdb -U grc_prod_user -d gigachad_grc_prod --analyze

# Reindex database
docker compose -f docker-compose.prod.yml exec postgres reindexdb -U grc_prod_user -d gigachad_grc_prod

# Check database size
docker compose -f docker-compose.prod.yml exec postgres psql -U grc_prod_user -d gigachad_grc_prod -c "SELECT pg_size_pretty(pg_database_size('gigachad_grc_prod'));"
```

### Certificate Renewal

Let's Encrypt certificates auto-renew. To manually renew:

```bash
# Check certificate expiry
docker compose -f docker-compose.prod.yml exec traefik cat /letsencrypt/acme.json

# Force renewal (if needed)
docker compose -f docker-compose.prod.yml restart traefik
```

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Verify environment variables
docker compose -f docker-compose.prod.yml config

# Check disk space
df -h

# Check memory
free -h
```

#### Database Connection Issues

```bash
# Test database connectivity
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify credentials
docker compose -f docker-compose.prod.yml exec postgres psql -U grc_prod_user -d gigachad_grc_prod -c "SELECT 1;"
```

#### SSL Certificate Issues

```bash
# Check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik

# Verify DNS records
dig grc.example.com
dig auth.grc.example.com

# Check certificate
openssl s_client -connect grc.example.com:443 -servername grc.example.com

# Clear acme.json and restart (will regenerate certificates)
docker compose -f docker-compose.prod.yml down
docker volume rm gigachad-grc_traefik_letsencrypt
docker compose -f docker-compose.prod.yml up -d
```

#### High Memory Usage

```bash
# Check container stats
docker stats

# Check service-specific memory
docker compose -f docker-compose.prod.yml exec controls node -e "console.log(process.memoryUsage())"

# Adjust memory limits in docker-compose.prod.yml
# Restart services
docker compose -f docker-compose.prod.yml restart
```

#### Performance Issues

```bash
# Check system resources
htop

# Check database performance
docker compose -f docker-compose.prod.yml exec postgres psql -U grc_prod_user -d gigachad_grc_prod -c "SELECT * FROM pg_stat_activity;"

# Analyze slow queries
docker compose -f docker-compose.prod.yml exec postgres psql -U grc_prod_user -d gigachad_grc_prod -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Clear Redis cache
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Getting Help

1. Check logs: `docker compose logs -f [service_name]`
2. Review configuration: `docker compose config`
3. Check GitHub issues: https://github.com/yourusername/gigachad-grc/issues
4. Contact support: support@example.com

## Security Best Practices

### 1. Secrets Management

- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets every 90 days
- Never commit secrets to version control
- Use strong passwords (32+ characters)

### 2. Network Security

```bash
# Use firewall
sudo ufw enable
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Configure fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker compose pull

# Update application
git pull
```

### 4. Monitoring & Alerts

- Set up monitoring (Prometheus/Grafana)
- Configure alerts for:
  - Service downtime
  - High resource usage
  - Failed authentications
  - Certificate expiration

### 5. Access Control

- Use SSH keys (disable password authentication)
- Implement 2FA for admin accounts
- Follow principle of least privilege
- Regular security audits

### 6. Data Protection

- Enable encryption at rest
- Use SSL/TLS for all communications
- Regular backups (automated)
- Test disaster recovery procedures

### 7. Compliance

- Enable audit logging
- Retain logs per compliance requirements
- Regular security assessments
- Document procedures

## Production Checklist

Before going live:

- [ ] All secrets generated and configured
- [ ] SSL certificates working
- [ ] DNS records configured
- [ ] Firewall rules applied
- [ ] Backups configured and tested
- [ ] Monitoring and alerting setup
- [ ] Log aggregation configured
- [ ] Disaster recovery tested
- [ ] Security scan completed
- [ ] Performance testing done
- [ ] Documentation reviewed
- [ ] Team trained on operations
- [ ] Incident response plan ready
- [ ] Compliance requirements met
- [ ] Contact information updated

## Support

For production support:

- **Email**: support@example.com
- **Slack**: #grc-support
- **On-call**: +1-XXX-XXX-XXXX
- **Documentation**: https://docs.example.com/grc

---

**Last Updated**: 2025-12-05
**Version**: 1.0.0
