# Data Scrubbing & Credential Management Guide

## Quick Data Wipe

To completely remove all data from the platform:

```bash
# Interactive scrubbing with confirmation
bash scripts/data-scrub.sh

# Or manually:
docker-compose down
docker volume rm gigachad-grc_postgres_data gigachad-grc_redis_data gigachad-grc_minio_data
rm -rf storage/
```

## What Gets Removed

### Database (PostgreSQL)
- ✅ All controls, frameworks, and compliance data
- ✅ All risk assessments and treatments
- ✅ All vendor, assessment, and contract records
- ✅ All questionnaires and knowledge base entries
- ✅ All audit records, requests, and findings
- ✅ All policies and versions
- ✅ All evidence metadata
- ✅ All user activities and audit logs
- ✅ Keycloak user accounts and sessions

### Object Storage (MinIO)
- ✅ All uploaded evidence files
- ✅ All policy documents
- ✅ All assessment documentation
- ✅ All audit evidence files

### Cache (Redis)
- ✅ All session data
- ✅ All cached queries
- ✅ All temporary data

### Local Files
- ✅ Local storage directory (if using local storage)

## Current Credentials in Platform

### Default Development Credentials

These credentials are included for development ONLY and are visible in the code:

| Service | Username/Key | Password/Secret | Location |
|---------|--------------|-----------------|----------|
| **PostgreSQL** | `grc` | `grc_secret` | docker-compose.yml |
| **Redis** | N/A | `redis_secret` | docker-compose.yml |
| **Keycloak Admin** | `admin` | `admin` | docker-compose.yml |
| **MinIO** | `minioadmin` | `minioadminpassword` | docker-compose.yml |

### Where Credentials Are Stored

1. **docker-compose.yml** - Uses environment variables with fallback to default values
2. **.env.example** - Template file with placeholders
3. **.env** - Your actual credentials (NOT in git, create from .env.example)

### Credential Security Status

✅ **GOOD:**
- All credentials use environment variables
- Default values are only fallbacks for development
- .env files are in .gitignore
- No hardcoded credentials in source code
- Credentials can be overridden via .env file

⚠️ **ACTION REQUIRED:**
- Default credentials MUST be changed for production
- Create .env file with strong passwords
- Use secrets manager for production deployments

## Credential Audit

Run the credential audit script to check for exposed credentials:

```bash
bash scripts/credential-audit.sh
```

This script checks for:
- .env files that shouldn't be committed
- Hardcoded passwords in source code
- API keys in code
- AWS/cloud credentials
- Default credentials usage

## Production Deployment Checklist

Before going to production:

### 1. Create Production .env File

```bash
cp .env.example .env
nano .env  # Update all values
```

Required changes:
- [ ] `POSTGRES_PASSWORD` - Use 32+ character random password
- [ ] `REDIS_PASSWORD` - Use 32+ character random password
- [ ] `KEYCLOAK_ADMIN_PASSWORD` - Use 32+ character random password
- [ ] `MINIO_ROOT_PASSWORD` - Use 32+ character random password

Generate strong passwords:
```bash
# Generate a strong password
openssl rand -base64 32

# Or use pwgen
pwgen -s 32 1
```

### 2. Enable Production Mode

Update docker-compose.yml or create docker-compose.prod.yml:

```yaml
keycloak:
  command: start  # Remove --dev flag
  environment:
    KC_HOSTNAME_STRICT: "true"
    KC_HTTP_ENABLED: "false"
    KC_HTTPS_ENABLED: "true"
    # Add SSL certificate paths
```

### 3. Use Secrets Manager (Recommended)

For production, use a proper secrets manager:

**AWS Secrets Manager:**
```bash
# Store secret
aws secretsmanager create-secret \
  --name grc/postgres/password \
  --secret-string "your-strong-password"

# Retrieve in docker-compose
POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id grc/postgres/password \
  --query SecretString --output text)
```

**HashiCorp Vault:**
```bash
# Store secret
vault kv put secret/grc/postgres password="your-strong-password"

# Retrieve
vault kv get -field=password secret/grc/postgres
```

**Docker Secrets:**
```yaml
services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    external: true
```

### 4. Enable TLS/SSL

Generate certificates:
```bash
# Self-signed (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/key.pem -out ./certs/cert.pem

# Let's Encrypt (production)
certbot certonly --standalone -d your-domain.com
```

Update Traefik configuration for HTTPS.

### 5. Rotate Credentials Regularly

Set up credential rotation schedule:
- PostgreSQL: Every 90 days
- Redis: Every 90 days
- Keycloak: Every 90 days
- MinIO: Every 90 days
- API Keys: Every 30 days

## API Keys & Integration Credentials

### FieldGuide Integration

If using FieldGuide:

```bash
# Add to .env (never commit)
FIELDGUIDE_API_KEY=your-api-key-here
FIELDGUIDE_WEBHOOK_SECRET=your-webhook-secret-here
```

### Other Integrations

Store all third-party credentials as environment variables:

```bash
# Security scanning tools
TENABLE_API_KEY=your-key
QUALYS_USERNAME=your-username
QUALYS_PASSWORD=your-password

# SIEM integrations
SPLUNK_API_TOKEN=your-token
DATADOG_API_KEY=your-key
```

## Verifying Data Removal

After scrubbing, verify everything is clean:

```bash
# Check volumes are removed
docker volume ls | grep gigachad-grc
# Should return nothing

# Check no containers are running
docker-compose ps
# Should return nothing or all stopped

# Check local files
ls -la storage/
# Should not exist or be empty

# Start fresh and verify empty database
docker-compose up -d postgres
docker-compose exec postgres psql -U grc -d gigachad_grc \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Should return 0 (no tables yet)
```

## Starting Fresh After Scrubbing

```bash
# 1. Update credentials in .env
cp .env.example .env
nano .env  # Update all CHANGE_ME values

# 2. Start services
docker-compose up -d

# 3. Wait for services to be healthy
docker-compose ps

# 4. Push database schema
DATABASE_URL='postgresql://grc:NEW_PASSWORD@localhost:5433/gigachad_grc' \
  npm run prisma:push --schema=services/shared/prisma/schema.prisma

# 5. Verify services
curl http://localhost:3001/api/docs  # Controls API
curl http://localhost:3002/api/docs  # Frameworks API
curl http://localhost:3007/api/docs  # Audit API

# 6. Access frontend
open http://localhost:5173
```

## Backup Before Scrubbing (Optional)

If you want to backup data before scrubbing:

```bash
# Backup database
docker-compose exec postgres pg_dump -U grc gigachad_grc > backup_$(date +%Y%m%d).sql

# Backup MinIO (evidence files)
docker-compose exec minio mc mirror /data/grc-evidence ./minio-backup/

# Backup Redis (cache - usually not needed)
docker-compose exec redis redis-cli --rdb /data/dump.rdb
docker cp grc-redis:/data/dump.rdb ./redis-backup.rdb
```

## Restore from Backup

```bash
# Restore database
cat backup_20240101.sql | docker-compose exec -T postgres psql -U grc gigachad_grc

# Restore MinIO
docker-compose exec minio mc mirror ./minio-backup/ /data/grc-evidence/
```

## Support

For questions about data scrubbing or credential management:
1. Review SECURITY.md
2. Check this guide
3. Contact your security team
4. Create an issue on GitHub (do NOT include credentials!)

## Additional Resources

- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [12-Factor App Config](https://12factor.net/config)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
