# GigaChad GRC - Production Deployment Checklist

Use this checklist to ensure a successful production deployment of GigaChad GRC.

## Pre-Deployment Checklist

### Infrastructure Setup

- [ ] **Server provisioned** with minimum requirements (4 CPU, 16GB RAM, 100GB SSD)
- [ ] **Operating System**: Ubuntu 22.04 LTS or later installed
- [ ] **Docker** (v24.0+) installed and running
- [ ] **Docker Compose** (v2.20+) installed
- [ ] **Git** installed
- [ ] **Server has static IP address**
- [ ] **Firewall configured** (ports 80, 443, 22)
- [ ] **SSH access** configured with key-based authentication
- [ ] **Root/sudo access** available

### Domain & DNS

- [ ] **Domain purchased** and registered
- [ ] **DNS A records** configured:
  - [ ] `grc.example.com` → Server IP
  - [ ] `auth.grc.example.com` → Server IP
  - [ ] `storage.grc.example.com` → Server IP
  - [ ] `console.storage.grc.example.com` → Server IP
- [ ] **DNS propagation verified** (nslookup/dig)
- [ ] **TTL lowered** (24 hours before deployment)

### Security Preparation

- [ ] **Strong passwords generated** for all services
- [ ] **JWT secrets generated** using openssl
- [ ] **Encryption keys generated**
- [ ] **SSL strategy decided** (Let's Encrypt or custom certificates)
- [ ] **SMTP credentials** obtained (if using email notifications)
- [ ] **Secrets manager** configured (optional but recommended)
- [ ] **Backup storage** location identified
- [ ] **Security scanning tools** installed (optional)

### Team Preparation

- [ ] **Deployment team identified**
- [ ] **Communication channels** established
- [ ] **Rollback plan** documented
- [ ] **Emergency contacts** list created
- [ ] **Deployment window scheduled**
- [ ] **Stakeholders notified**

## Deployment Checklist

### Phase 1: Environment Setup (30 minutes)

- [ ] **Repository cloned** to `/opt/gigachad-grc`
- [ ] **Environment file created** from `.env.example.prod`
- [ ] **All REPLACE_WITH_* values updated** in `.env.prod`
- [ ] **Domain names updated** in `.env.prod`
- [ ] **ACME email configured** for Let's Encrypt
- [ ] **File permissions set** (`chmod 600 .env.prod`)
- [ ] **.env.prod added to .gitignore**
- [ ] **Configuration validated** (`docker compose config`)

### Phase 2: Security Configuration (15 minutes)

- [ ] **PostgreSQL password** set (32+ characters)
- [ ] **Redis password** set (32+ characters)
- [ ] **Keycloak admin password** set (32+ characters)
- [ ] **MinIO credentials** set (20+ characters)
- [ ] **JWT_SECRET** generated (64 characters)
- [ ] **SESSION_SECRET** generated (64 characters)
- [ ] **ENCRYPTION_KEY** generated (32 characters hex)
- [ ] **All secrets documented** in secrets manager
- [ ] **Secrets backup** stored securely offline

### Phase 3: Initial Deployment (20 minutes)

- [ ] **Docker images pulled** successfully
- [ ] **Services built** without errors
- [ ] **All containers started** (`docker compose up -d`)
- [ ] **All services running** (`docker compose ps`)
- [ ] **No error logs** in initial startup
- [ ] **Health checks passing** for all services
- [ ] **Database initialized** successfully
- [ ] **Redis responding** to ping

### Phase 4: SSL/TLS Configuration (10 minutes)

- [ ] **Let's Encrypt certificate** generated automatically OR
- [ ] **Custom SSL certificates** installed
- [ ] **HTTPS accessible** on all domains
- [ ] **HTTP redirects to HTTPS** working
- [ ] **Certificate validity verified** (3 months for Let's Encrypt)
- [ ] **Certificate auto-renewal** configured
- [ ] **SSL Labs test** run (Grade A or higher)

### Phase 5: Service Configuration (30 minutes)

#### Keycloak

- [ ] **Admin console accessible** at `https://auth.your-domain.com`
- [ ] **Admin login working** with configured credentials
- [ ] **Realm imported** or created (`grc`)
- [ ] **Frontend URL configured**
- [ ] **Clients created** for all services
- [ ] **Client secrets** generated and documented
- [ ] **User federation configured** (if using LDAP/AD)
- [ ] **Test user created**
- [ ] **Authentication flow tested**

#### MinIO

- [ ] **Console accessible** at `https://console.storage.your-domain.com`
- [ ] **Admin login working**
- [ ] **Buckets created**:
  - [ ] `grc-evidence-prod`
  - [ ] `grc-backups-prod`
- [ ] **Bucket policies configured**
- [ ] **Access keys created** for applications
- [ ] **File upload tested**
- [ ] **File download tested**

#### PostgreSQL

- [ ] **Database accessible** from services
- [ ] **Migrations run** successfully
- [ ] **Database seeding completed** (if applicable)
- [ ] **Connection pool configured**
- [ ] **Query performance acceptable**
- [ ] **Database backup tested**

#### Application Services

- [ ] **All services responding** to health checks
- [ ] **Inter-service communication** working
- [ ] **API endpoints accessible**
- [ ] **Authentication working** end-to-end
- [ ] **File uploads working**
- [ ] **Cache functioning** (Redis)

### Phase 6: Backup Configuration (15 minutes)

- [ ] **Backup directory created** (`/backups/gigachad-grc`)
- [ ] **Backup script tested** (`./deploy/backup.sh`)
- [ ] **Backup completed** successfully
- [ ] **Backup size verified** (reasonable)
- [ ] **Cron job configured** for automatic backups
- [ ] **Backup retention configured** (30 days)
- [ ] **Remote backup configured** (if applicable)
- [ ] **Restore script tested** (`./deploy/restore.sh`)
- [ ] **Disaster recovery procedure documented**

### Phase 7: Monitoring & Logging (20 minutes)

- [ ] **Log aggregation** configured (optional)
- [ ] **Metrics collection** setup (optional)
- [ ] **Health check monitoring** enabled
- [ ] **Alerting configured** for critical services
- [ ] **Log rotation** verified
- [ ] **Disk space monitoring** setup
- [ ] **Performance metrics** baseline established
- [ ] **Error tracking** configured (Sentry, optional)

### Phase 8: Testing & Validation (30 minutes)

#### Functional Testing

- [ ] **User registration** working
- [ ] **User login** working
- [ ] **Password reset** working
- [ ] **2FA** working (if enabled)
- [ ] **SSO** working (if configured)
- [ ] **API endpoints** responding correctly
- [ ] **File uploads/downloads** working
- [ ] **Search functionality** working
- [ ] **Notifications** working (if configured)

#### Performance Testing

- [ ] **Page load times** acceptable (<3 seconds)
- [ ] **API response times** acceptable (<500ms)
- [ ] **Database query performance** acceptable
- [ ] **Concurrent users** tested
- [ ] **Resource usage** within limits

#### Security Testing

- [ ] **HTTPS enforced** on all endpoints
- [ ] **Security headers** present
- [ ] **Rate limiting** functional
- [ ] **CORS** configured correctly
- [ ] **Authentication required** for protected endpoints
- [ ] **SQL injection** protection verified
- [ ] **XSS protection** verified
- [ ] **CSRF protection** verified

### Phase 9: Documentation (15 minutes)

- [ ] **Deployment date** documented
- [ ] **Configuration details** documented
- [ ] **Credentials location** documented
- [ ] **Emergency procedures** documented
- [ ] **Rollback procedures** documented
- [ ] **Team access** documented
- [ ] **Support contacts** documented
- [ ] **SLA commitments** documented

## Post-Deployment Checklist

### Immediate (Day 1)

- [ ] **Monitor logs** for errors
- [ ] **Check service health** every hour
- [ ] **Verify backup** ran successfully
- [ ] **Test user access** from different locations
- [ ] **Monitor resource usage** (CPU, RAM, disk)
- [ ] **Document any issues** encountered
- [ ] **Communicate** deployment success to stakeholders

### Week 1

- [ ] **Daily backup verification**
- [ ] **Daily log review**
- [ ] **Performance monitoring**
- [ ] **User feedback collection**
- [ ] **Minor bug fixes** deployed
- [ ] **Documentation updates**
- [ ] **Team training** completed

### Month 1

- [ ] **Weekly backup restoration test**
- [ ] **Security scan** performed
- [ ] **Performance optimization** implemented
- [ ] **Monitoring alerts** tuned
- [ ] **Disaster recovery drill** executed
- [ ] **Quarterly review scheduled**
- [ ] **Compliance audit** (if applicable)

## Rollback Checklist

If issues occur and rollback is needed:

- [ ] **Stop all services** (`docker compose down`)
- [ ] **Restore from last known good backup**
- [ ] **Verify restoration** successful
- [ ] **Test functionality** before announcing rollback
- [ ] **Document rollback reason**
- [ ] **Communicate** to stakeholders
- [ ] **Schedule post-mortem** meeting

## Maintenance Schedule

### Daily

- [ ] Monitor service health
- [ ] Review error logs
- [ ] Verify backups completed

### Weekly

- [ ] Review performance metrics
- [ ] Test backup restoration
- [ ] Update security patches
- [ ] Review access logs

### Monthly

- [ ] Security scan
- [ ] Disaster recovery drill
- [ ] Database maintenance
- [ ] Certificate expiry check
- [ ] Resource capacity planning

### Quarterly

- [ ] Comprehensive security audit
- [ ] Performance optimization
- [ ] Documentation review
- [ ] Team training refresh
- [ ] Compliance review

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Deployment Lead | | | |
| DevOps Engineer | | | |
| Database Admin | | | |
| Security Officer | | | |
| On-Call Support | | | 24/7 |

## Sign-Off

### Pre-Deployment Review

- [ ] Technical Lead: __________________ Date: __________
- [ ] Security Officer: ________________ Date: __________
- [ ] Operations Manager: ______________ Date: __________

### Post-Deployment Verification

- [ ] Technical Lead: __________________ Date: __________
- [ ] Security Officer: ________________ Date: __________
- [ ] Operations Manager: ______________ Date: __________

### Production Approval

- [ ] Product Owner: ___________________ Date: __________
- [ ] Executive Sponsor: _______________ Date: __________

---

**Deployment Date**: __________________
**Deployment Version**: __________________
**Deployed By**: __________________

---

**Notes:**

Use this space to document any deployment-specific notes, issues encountered, or deviations from the standard process:

```
[Add your notes here]
```

---

**For assistance, refer to:**
- [deploy/README.md](./README.md) - Comprehensive deployment guide
- [deploy/QUICKSTART.md](./QUICKSTART.md) - Quick reference guide
