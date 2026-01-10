# GigaChad GRC - Deployment Guide

## Overview

GigaChad GRC is designed for **self-hosted deployment** in customer infrastructure. This guide outlines the deployment path from development to production.

## Deployment Options

### Option 1: AWS (Terraform) - **Recommended for Enterprise**
Full infrastructure-as-code deployment with:
- ✅ Production-ready architecture
- ✅ High availability and auto-scaling
- ✅ Automated backups and disaster recovery
- ✅ Security best practices built-in
- ✅ Cost optimization options

**Location**: `terraform/`

**Deployment Time**: 20-30 minutes

**Prerequisites**:
- AWS account
- Terraform installed
- Docker images in ECR/Docker Hub
- SSL certificate in AWS Certificate Manager

**Quick Start**:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

See [terraform/README.md](terraform/README.md) for detailed instructions.

---

### Option 2: Docker Compose - **Simple Single-Server**
Lightweight deployment for:
- Development and testing
- Small teams (<50 users)
- Single-server deployments
- Proof of concept

**Location**: `docker-compose.yml` (current directory)

**Deployment Time**: 5-10 minutes

**Prerequisites**:
- Linux server with Docker and Docker Compose
- 4GB+ RAM
- 50GB+ disk space

**Quick Start**:
```bash
# Clone repository
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# Run migrations
docker-compose exec controls npm run prisma:migrate

# Access at http://localhost
```

---

## Architecture Components

### Required Services
1. **PostgreSQL** - Primary database
2. **Redis** - Caching and sessions
3. **RustFS/S3** - File storage (S3-compatible)
4. **Keycloak** - Authentication and SSO

### Application Services
1. **Controls Service** (Port 3001)
2. **Frameworks Service** (Port 3002)
3. **Policies Service** (Port 3004)
4. **TPRM Service** (Port 3005)
5. **Trust Service** (Port 3006)
6. **Audit Service** (Port 3007)
7. **Frontend** (Port 3000)

### Optional Services
- **Traefik** - API Gateway/Load Balancer
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards

---

## Deployment Sizes and Costs

### Small (Development/Testing)
**Infrastructure**: Single server or AWS t3.large
**Users**: 1-10
**AWS Cost**: ~$200-300/month
**Hardware**: 4 vCPU, 8GB RAM, 100GB storage

### Medium (Production)
**Infrastructure**: AWS with Multi-AZ
**Users**: 10-100
**AWS Cost**: ~$500-800/month
**Specs**:
- RDS db.t3.large
- ElastiCache cache.t3.medium
- 2 ECS tasks per service

### Large (Enterprise)
**Infrastructure**: AWS with auto-scaling
**Users**: 100-1000+
**AWS Cost**: ~$1500-2500/month
**Specs**:
- RDS db.r6g.xlarge with read replicas
- ElastiCache cluster
- Auto-scaling ECS services
- CloudFront CDN

---

## Network Requirements

### Inbound Ports
- **443/HTTPS** - Application access
- **80/HTTP** - Redirect to HTTPS (optional)

### Outbound Requirements
- **443/HTTPS** - External APIs, Keycloak
- **25/587/SMTP** - Email notifications
- **DNS/53** - Domain resolution

### Internal Communication
All services communicate internally - no external exposure required.

---

## Security Considerations

### Data Protection
- ✅ Encryption at rest (RDS, S3)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Database credentials in secrets manager
- ✅ Regular automated backups

### Network Security
- ✅ VPC with private subnets
- ✅ Security groups with least privilege
- ✅ Optional VPN/bastion access
- ✅ WAF integration available

### Compliance
- ✅ SOC 2 Type II ready architecture
- ✅ GDPR compliant data handling
- ✅ Audit logs for all actions
- ✅ Data retention policies

---

## Monitoring and Observability

### Included Metrics
- Application health checks
- Database performance
- API response times
- Error rates and logs

### Optional Integrations
- Datadog
- New Relic
- Splunk
- CloudWatch (AWS)
- Prometheus + Grafana

---

## Backup and Disaster Recovery

### Automated Backups
- **Database**: Daily automated snapshots (7-day retention)
- **Files**: S3 versioning and lifecycle policies
- **Configuration**: Terraform state in S3

### Recovery Time Objectives
- **RTO**: 1-2 hours (time to restore)
- **RPO**: 24 hours (maximum data loss)

### Disaster Recovery Plan
1. Provision infrastructure in new region (Terraform)
2. Restore RDS from snapshot
3. Restore S3 files from backup
4. Update DNS to new region
5. Validate application functionality

---

## Migration from Development to Production

### 1. Prepare Container Images
```bash
# Build all services
docker-compose build

# Tag for production
docker tag gigachad-grc/controls:latest your-registry/controls:1.0.0

# Push to registry
docker push your-registry/controls:1.0.0
```

### 2. Set Up AWS Infrastructure
```bash
cd terraform
terraform apply
```

### 3. Deploy Database Schema
```bash
# SSH to ECS task or use Session Manager
npm run prisma:migrate
```

### 4. Configure DNS
Point your domain to the load balancer DNS from Terraform outputs.

### 5. Set Up Keycloak
Create realm, client, and users according to docs/keycloak-setup.md.

### 6. Validate Deployment
Run smoke tests and monitor logs for errors.

---

## Ongoing Maintenance

### Weekly
- Review application logs
- Check error rates
- Monitor resource utilization

### Monthly
- Review and apply security patches
- Analyze costs and optimize
- Test backup restoration
- Review user feedback

### Quarterly
- Perform security audit
- Update dependencies
- Capacity planning review
- Disaster recovery drill

---

## Getting Help

### Documentation
- **Architecture**: docs/architecture.md
- **API Reference**: docs/api/
- **User Guide**: docs/user-guide.md
- **Admin Guide**: docs/admin-guide.md

### Support Channels
- **Email**: support@example.com
- **GitHub Issues**: github.com/grcengineering/gigachad-grc/issues
- **Community Slack**: gigachad-grc.slack.com

### Professional Services
- **Implementation**: Custom deployment assistance
- **Training**: Admin and user training sessions
- **Consulting**: Architecture review and optimization

---

## Roadmap

### Current Status: ✅ Production Ready (v1.0)
- Core GRC functionality
- Multi-tenant architecture
- Self-hosted deployment via Terraform

### Upcoming (Q2 2024)
- Kubernetes/Helm deployment option
- Azure and GCP Terraform modules
- Enhanced reporting and dashboards
- Mobile app

### Future (Q3-Q4 2024)
- AI-powered risk assessment
- Third-party integrations (Jira, ServiceNow)
- Managed SaaS offering
- Advanced workflow automation

---

## License

Copyright © 2024 GigaChad GRC. All rights reserved.

This software is provided for self-hosted deployment only. See LICENSE.md for terms.
