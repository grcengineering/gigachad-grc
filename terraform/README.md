# GigaChad GRC Platform - Terraform Deployment

This directory contains Terraform configurations to deploy the GigaChad GRC platform to AWS.

## Architecture

The deployment creates:
- **VPC** with public and private subnets across multiple AZs
- **Application Load Balancer** with optional SSL/TLS
- **ECS Fargate** cluster running microservices
- **RDS PostgreSQL** database with automatic backups
- **ElastiCache Redis** for caching and sessions
- **S3** bucket for file storage (policies, evidence, etc.)
- **Security Groups** with least-privilege access

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.5.0 installed
3. **AWS CLI** configured with credentials
4. **Docker images** pushed to container registry (ECR or Docker Hub)
5. **SSL Certificate** in AWS Certificate Manager (for HTTPS)
6. **Keycloak** instance for authentication (can be self-hosted or managed)

## Quick Start

### 1. Configure Variables

```bash
# Copy the example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vi terraform.tfvars
```

**Required variables to change:**
- `aws_region` - Your AWS region
- `ssl_certificate_arn` - ARN of your SSL certificate
- `database_password` - Strong database password
- `container_registry` - Your container registry URL
- `keycloak_url` - Your Keycloak server URL
- `keycloak_client_secret` - Keycloak client secret
- `allowed_cidr_blocks` - IP ranges allowed to access the app

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Plan

```bash
terraform plan
```

Review the resources that will be created. Expected resources: ~50-70 resources.

### 4. Deploy

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes approximately 15-20 minutes.

### 5. Post-Deployment

After successful deployment:

```bash
# Get the load balancer URL
terraform output application_url

# Get all outputs
terraform output
```

See [Post-Deployment Steps](#post-deployment-steps) below.

## Deployment Sizes

We provide three pre-configured sizes:

### Small (Development/Testing)
**Cost**: ~$200-300/month
- Single AZ
- db.t3.medium RDS
- cache.t3.small Redis
- 1 ECS task per service

```bash
cd environments/small
terraform init
terraform apply
```

### Medium (Production - Standard)
**Cost**: ~$500-800/month
- Multi-AZ
- db.t3.large RDS
- cache.t3.medium Redis
- 2 ECS tasks per service

```bash
cd environments/medium
terraform init
terraform apply
```

### Large (Production - High Traffic)
**Cost**: ~$1500-2500/month
- Multi-AZ with auto-scaling
- db.r6g.xlarge RDS
- cache.r6g.large Redis cluster
- 4+ ECS tasks with auto-scaling

```bash
cd environments/large
terraform init
terraform apply
```

## Post-Deployment Steps

### 1. DNS Configuration

Point your domain to the load balancer:

```bash
# Get the load balancer DNS
terraform output load_balancer_dns

# Create a CNAME record:
# grc.yourdomain.com -> [load-balancer-dns]
```

### 2. Database Migrations

Run Prisma migrations to set up the database schema:

```bash
# Get database connection details
terraform output database_endpoint

# SSH to an ECS task or use AWS Session Manager
# Then run migrations:
cd /app/services/shared
npm run prisma:migrate
```

### 3. Create Initial Organization

```bash
# Access the database
psql -h [database-endpoint] -U grc_admin -d gigachad_grc

# Create organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  'your-org-id',
  'Your Organization',
  'your-org',
  '{}'::jsonb
);
```

### 4. Configure Keycloak

1. Log into your Keycloak admin console
2. Create a new realm: `grc`
3. Create a new client: `grc-platform`
4. Configure redirect URIs: `https://your-domain.com/*`
5. Enable "Direct Access Grants"
6. Copy the client secret and update your terraform.tfvars

### 5. Test the Deployment

```bash
curl https://your-domain.com/api/health
```

## Monitoring and Logging

### CloudWatch Logs

All container logs are sent to CloudWatch:

```bash
# View logs for a specific service
aws logs tail /ecs/gigachad-grc-production-controls --follow
```

### Metrics

Key metrics to monitor:
- **ECS Service**: CPU/Memory utilization
- **RDS**: CPU, connections, storage
- **ALB**: Request count, target response time
- **Redis**: CPU, evictions, memory

## Backup and Disaster Recovery

### Automated Backups

- **RDS**: Daily automated backups (7-day retention by default)
- **S3**: Versioning enabled for all objects

### Manual Backup

```bash
# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier gigachad-grc-production \
  --db-snapshot-identifier gigachad-grc-backup-$(date +%Y%m%d)

# Backup S3 bucket
aws s3 sync s3://gigachad-grc-production-files/ ./backup/
```

### Disaster Recovery

```bash
# Restore from RDS snapshot
terraform import module.rds.aws_db_instance.this gigachad-grc-production

# Restore S3 objects
aws s3 sync ./backup/ s3://gigachad-grc-production-files/
```

## Scaling

### Manual Scaling

```bash
# Update desired count in terraform.tfvars
ecs_service_desired_count = 4

# Apply changes
terraform apply
```

### Auto-Scaling (Large deployment only)

Auto-scaling is configured based on:
- CPU utilization > 70%
- Memory utilization > 80%
- ALB request count

## Security Best Practices

1. **Use AWS Secrets Manager** for sensitive values
2. **Enable VPC Flow Logs** for network monitoring
3. **Restrict `allowed_cidr_blocks`** to your organization's IPs
4. **Enable MFA** on AWS account
5. **Use IAM roles** instead of access keys
6. **Enable AWS GuardDuty** for threat detection
7. **Regular security audits** with AWS Config

## Cost Optimization

### Development/Testing
- Use `single_nat_gateway = true`
- Set `rds_multi_az = false`
- Use `db.t3.medium` instance class
- Reduce `ecs_service_desired_count` to 1

### Production
- Enable RDS Reserved Instances for ~40% savings
- Use Savings Plans for ECS Fargate
- Implement S3 lifecycle policies
- Schedule non-critical resources to stop overnight

## Troubleshooting

### ECS Tasks Fail to Start

```bash
# Check task logs
aws ecs describe-tasks --cluster gigachad-grc-production --tasks [task-id]

# Check service events
aws ecs describe-services --cluster gigachad-grc-production --services controls
```

### Database Connection Issues

```bash
# Verify security group rules
aws ec2 describe-security-groups --group-ids [rds-sg-id]

# Test connectivity from ECS task
aws ecs execute-command --cluster gigachad-grc-production \
  --task [task-id] \
  --container controls \
  --interactive \
  --command "/bin/sh"
```

### High Costs

```bash
# Analyze costs by service
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Check for idle resources
terraform state list | xargs -I {} terraform state show {}
```

## Cleanup

To destroy all resources:

```bash
# WARNING: This will delete everything including the database!
terraform destroy
```

## Support

For issues or questions:
- **Documentation**: docs/
- **GitHub Issues**: https://github.com/grcengineering/gigachad-grc/issues
- **Email**: support@your-domain.com

## License

Copyright © 2024 Your Company. All rights reserved.
