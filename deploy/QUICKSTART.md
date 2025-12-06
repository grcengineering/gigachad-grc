# GigaChad GRC - Production Deployment Quick Start

A quick reference guide for deploying GigaChad GRC to production.

## Quick Deployment Steps

### 1. Initial Setup (5-10 minutes)

```bash
# Clone repository
cd /opt
git clone https://github.com/yourusername/gigachad-grc.git
cd gigachad-grc

# Configure environment
cp .env.example.prod .env.prod
nano .env.prod  # Update all REPLACE_WITH_* values
chmod 600 .env.prod

# Update domain settings
# - APP_DOMAIN=your-domain.com
# - ACME_EMAIL=admin@your-domain.com
# - KEYCLOAK_HOSTNAME=auth.your-domain.com
```

### 2. Generate Secrets (2 minutes)

```bash
# Generate all secrets at once
openssl rand -base64 32 | tee -a /tmp/secrets.txt
openssl rand -base64 32 | tee -a /tmp/secrets.txt
openssl rand -base64 32 | tee -a /tmp/secrets.txt
openssl rand -base64 20 | tee -a /tmp/secrets.txt
openssl rand -base64 64 | tee -a /tmp/secrets.txt
openssl rand -hex 32 | tee -a /tmp/secrets.txt

# Copy secrets from /tmp/secrets.txt to .env.prod
```

### 3. Deploy (5-10 minutes)

```bash
# Build and start services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Post-Deployment (5 minutes)

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec controls npm run migrate

# Configure Keycloak
# Visit: https://auth.your-domain.com
# Login with KEYCLOAK_ADMIN credentials

# Configure MinIO
# Visit: https://console.storage.your-domain.com
# Login with MINIO_ROOT_USER credentials
```

## Daily Operations

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f controls

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Check Status

```bash
# All services
docker compose -f docker-compose.prod.yml ps

# Service health
docker compose -f docker-compose.prod.yml exec controls wget -O- http://localhost:3001/health
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart controls

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build controls
```

## Backup & Restore

### Create Backup

```bash
# Run backup script
./deploy/backup.sh

# Backup is stored in: /backups/gigachad-grc/backup-YYYY-MM-DD-HHMMSS.tar.gz
```

### Schedule Automatic Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/gigachad-grc/deploy/backup.sh >> /var/log/grc-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restore
./deploy/restore.sh /backups/gigachad-grc/backup-YYYY-MM-DD-HHMMSS.tar.gz

# Services will be automatically restarted
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h

# Restart Docker
sudo systemctl restart docker
```

### Database Issues

```bash
# Check PostgreSQL status
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# View active connections
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT * FROM pg_stat_activity;"
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik | grep -i certificate

# Verify DNS
dig your-domain.com

# Test SSL
openssl s_client -connect your-domain.com:443
```

### High Resource Usage

```bash
# Check container stats
docker stats

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Maintenance

### Update Application

```bash
# Backup first
./deploy/backup.sh

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Maintenance

```bash
# Vacuum database
docker compose -f docker-compose.prod.yml exec postgres vacuumdb -U $POSTGRES_USER -d $POSTGRES_DB --analyze

# Check database size
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));"
```

### Clean Up Old Data

```bash
# Remove old Docker images
docker image prune -a

# Remove old backups (older than 30 days)
find /backups/gigachad-grc/ -name "backup-*.tar.gz" -mtime +30 -delete

# Remove old logs
find /var/log/ -name "grc-*.log" -mtime +30 -delete
```

## Security Checklist

- [ ] All default passwords changed
- [ ] SSL/TLS certificates configured
- [ ] Firewall enabled (ports 80, 443, 22 only)
- [ ] Backups configured and tested
- [ ] Monitoring setup
- [ ] Log aggregation configured
- [ ] Regular security updates scheduled
- [ ] Access logs reviewed regularly
- [ ] Incident response plan documented

## Monitoring Endpoints

- **Application**: https://your-domain.com
- **Keycloak**: https://auth.your-domain.com
- **MinIO Console**: https://console.storage.your-domain.com
- **Health Check**: https://your-domain.com/api/health

## Useful Commands

```bash
# View environment variables
docker compose -f docker-compose.prod.yml config

# Execute command in container
docker compose -f docker-compose.prod.yml exec controls sh

# Copy files from container
docker cp grc-controls:/app/logs ./logs

# View resource usage
docker stats --no-stream

# Check network connectivity
docker compose -f docker-compose.prod.yml exec controls ping postgres
```

## Emergency Procedures

### Service Down

```bash
# 1. Check service status
docker compose -f docker-compose.prod.yml ps

# 2. Check logs
docker compose -f docker-compose.prod.yml logs [service]

# 3. Restart service
docker compose -f docker-compose.prod.yml restart [service]

# 4. If restart fails, rebuild
docker compose -f docker-compose.prod.yml up -d --build [service]
```

### Database Corruption

```bash
# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Restore from latest backup
./deploy/restore.sh /backups/gigachad-grc/backup-[latest].tar.gz

# 3. Verify restoration
docker compose -f docker-compose.prod.yml logs -f
```

### Out of Disk Space

```bash
# 1. Check disk usage
df -h
docker system df

# 2. Clean Docker resources
docker system prune -a --volumes

# 3. Remove old backups
find /backups -mtime +7 -delete

# 4. Clean logs
truncate -s 0 /var/log/*.log
```

## Support Contacts

- **Technical Support**: support@example.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Documentation**: https://docs.example.com
- **GitHub Issues**: https://github.com/yourusername/gigachad-grc/issues

---

**For detailed documentation, see**: [deploy/README.md](./README.md)
