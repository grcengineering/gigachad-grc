# Security Guidelines for GigaChad GRC

## Credential Management

### Default Credentials (MUST BE CHANGED)

The following default credentials are included for development purposes **ONLY**. These MUST be changed before deploying to production:

1. **PostgreSQL Database**
   - Username: `grc`
   - Password: `grc_secret` ← CHANGE THIS

2. **Redis Cache**
   - Password: `redis_secret` ← CHANGE THIS

3. **Keycloak Admin**
   - Username: `admin`
   - Password: `admin` ← CHANGE THIS

4. **MinIO Object Storage**
   - Access Key: `minioadmin`
   - Secret Key: `minioadminpassword` ← CHANGE THIS

### Production Deployment Checklist

Before deploying to production:

- [ ] Change all default passwords in `.env` file
- [ ] Enable TLS/SSL for all services
- [ ] Configure Keycloak for production mode
- [ ] Use proper secrets management (e.g., HashiCorp Vault, AWS Secrets Manager)
- [ ] Review and harden Docker images
- [ ] Enable multi-factor authentication in Keycloak
- [ ] Configure proper backup strategies for PostgreSQL and MinIO
- [ ] Set up monitoring and alerting
- [ ] Review and configure CORS policies
- [ ] Enable audit logging for all services
- [ ] Configure proper firewall rules
- [ ] Use environment-specific `.env` files (never commit to git)

## Data Scrubbing

To completely wipe all data and reset the platform:

```bash
# Stop all services and remove all data
bash scripts/data-scrub.sh

# Or manually:
docker-compose down
docker volume rm gigachad-grc_postgres_data
docker volume rm gigachad-grc_redis_data
docker volume rm gigachad-grc_minio_data

# Start fresh
docker-compose up -d
```

## API Keys and Integration Credentials

### FieldGuide Integration
If using FieldGuide integration, store API keys as environment variables:
```
FIELDGUIDE_API_KEY=your-api-key-here
FIELDGUIDE_WEBHOOK_SECRET=your-webhook-secret-here
```

### Other Integrations
Store all third-party API credentials in environment variables or secrets manager, never in code.

## Database Security

1. **Connection Security**
   - Use SSL/TLS for database connections in production
   - Restrict database access to internal network only
   - Use strong, unique passwords (minimum 32 characters)

2. **Access Control**
   - Each service connects with minimal required permissions
   - Separate admin account for migrations
   - Regular password rotation

3. **Backup & Recovery**
   - Automated daily backups
   - Encrypted backup storage
   - Tested recovery procedures
   - Point-in-time recovery capability

## Authentication & Authorization

### Keycloak Configuration

1. **Production Setup**
   ```bash
   # Disable dev mode
   KC_HOSTNAME_STRICT=true
   KC_HTTP_ENABLED=false
   KC_HTTPS_ENABLED=true
   ```

2. **Password Policies**
   - Minimum 12 characters
   - Require uppercase, lowercase, numbers, symbols
   - Password expiration: 90 days
   - Password history: 5 previous passwords

3. **Session Management**
   - Session timeout: 30 minutes idle
   - Absolute session timeout: 8 hours
   - Require re-authentication for sensitive operations

### Role-Based Access Control (RBAC)

Default roles and their permissions:

1. **Admin**
   - Full system access
   - User management
   - Configuration changes

2. **Compliance Manager**
   - Manage controls, evidence, frameworks
   - Create and approve policies
   - View audit logs

3. **Risk Manager**
   - Manage risks and treatments
   - View controls and evidence
   - Generate risk reports

4. **Auditor** (Internal)
   - Read-only access to controls and evidence
   - View audit logs
   - Access audit findings

5. **Auditor** (External - Portal Access)
   - Limited time-based access
   - View assigned audit requests
   - Upload evidence to specific requests
   - Comment on requests

6. **Viewer**
   - Read-only access to dashboards
   - View controls (no edit)
   - No access to audit logs or sensitive data

## Network Security

### Internal Communication
All services communicate over internal Docker network. External access only through Traefik gateway.

### API Gateway (Traefik)
- Rate limiting enabled
- Request size limits
- Timeout configuration
- CORS policies
- Security headers

### Firewall Rules
```
# Only allow necessary ports
22   - SSH (admin only)
80   - HTTP (redirect to HTTPS)
443  - HTTPS (application)
8080 - Keycloak (internal network only)
```

## Data Protection

### Personal Data Handling
- User information stored in Keycloak
- No passwords stored in application database
- Audit logs contain user activities (GDPR/privacy compliance)

### Evidence Storage
- Files encrypted at rest (MinIO encryption)
- Access control per document
- Audit trail for all file access
- Retention policies enforced

### Data Retention
- Audit logs: 7 years
- Evidence: Per policy requirements
- User data: 30 days after account deletion
- Risk assessments: 3 years

## Incident Response

### Security Incident Procedures
1. Immediately disable affected accounts
2. Rotate all credentials
3. Review audit logs for impact assessment
4. Notify affected parties if required
5. Document incident in system

### Contact
For security issues, contact: security@your-company.com

## Compliance

This platform helps maintain compliance with:
- SOC 2 Type II
- ISO 27001:2022
- GDPR (data protection)
- HIPAA (healthcare data)
- PCI DSS (payment data)

## Regular Security Tasks

### Daily
- Monitor error logs
- Check failed login attempts

### Weekly
- Review new user accounts
- Check access permissions
- Review audit logs

### Monthly
- Update dependencies
- Review and rotate API keys
- Security scan of containers
- Penetration testing (external)

### Quarterly
- Full security audit
- Password policy review
- Access control review
- Disaster recovery test

## Reporting Security Issues

To report a security vulnerability:
1. Do NOT create a public GitHub issue
2. Email security@your-company.com
3. Include detailed description and reproduction steps
4. We will respond within 48 hours

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
