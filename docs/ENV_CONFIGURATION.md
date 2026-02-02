# GigaChad GRC - Environment Configuration Reference

Complete reference for all environment variables used across the platform.

## Quick Setup

For local development, most defaults work out of the box. For production, see [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md).

---

## Backend Services

All backend services share common environment variables:

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |
| `NODE_ENV` | `development` \| `production` | Environment mode |

### Database Configuration

```bash
# Full connection string (preferred)
DATABASE_URL=postgresql://grc_user:grc_password@localhost:5432/gigachad_grc

# Or individual components (for docker-compose)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=grc_user
POSTGRES_PASSWORD=grc_password
POSTGRES_DB=gigachad_grc

# Connection pooling (optional)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=10000
```

### Redis Configuration

```bash
# Simple connection
REDIS_URL=redis://localhost:6379

# With password
REDIS_URL=redis://:password@localhost:6379

# With database number
REDIS_URL=redis://localhost:6379/0
```

### Authentication (Keycloak)

```bash
# Keycloak server
KEYCLOAK_URL=http://localhost:8080

# Realm and client
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-backend
KEYCLOAK_CLIENT_SECRET=secret-from-keycloak
```

### File Storage

```bash
# Local storage (development)
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# S3 storage (production)
STORAGE_PROVIDER=s3
S3_BUCKET=grc-files
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=secret
S3_ENDPOINT=  # Leave empty for AWS, set for RustFS or other S3-compatible
```

### Email

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourcompany.com
SMTP_PASSWORD=app-password
SMTP_FROM=GigaChad GRC <notifications@yourcompany.com>
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
```

### Error Tracking

```bash
SENTRY_DSN=https://xxx@sentry.io/123
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2
```

### Security

```bash
# JWT secret for internal auth (generate: openssl rand -base64 32)
JWT_SECRET=your-secret-here

# Encryption key for sensitive data (minimum 32 characters)
ENCRYPTION_KEY=your-encryption-key

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# CORS - comma-separated list of allowed origins
CORS_ORIGINS=https://grc.yourcompany.com,https://www.yourcompany.com
```

### Proxy Authentication (v1.1.0+)

When using an authentication proxy (Keycloak, Auth0, etc.) that sets user context headers,
configure these variables for additional security:

```bash
# Shared secret between auth proxy and backend services
# The proxy must send this value in the x-proxy-secret header
# Generate: openssl rand -base64 32
AUTH_PROXY_SECRET=your-32-character-secret-here

# Require proxy authentication (default: false)
# When true, requests without valid x-proxy-secret are rejected
# When false, requests without x-proxy-secret are allowed (for backwards compatibility)
REQUIRE_PROXY_AUTH=true
```

**Security Note:** Without `AUTH_PROXY_SECRET`, the application relies on network isolation
to prevent clients from forging `x-user-id` and `x-organization-id` headers. In production,
you should either:
1. Set `AUTH_PROXY_SECRET` and configure your auth proxy to send it, OR
2. Ensure network isolation prevents direct client access to backend services

The auth guard validates that user and organization IDs are valid UUIDs and uses
timing-safe comparison for proxy secrets to prevent timing attacks.

### Service Ports

Each microservice runs on a specific port:

| Service | Port | Environment Variable |
|---------|------|---------------------|
| Controls | 3001 | `CONTROLS_PORT` |
| Frameworks | 3002 | `FRAMEWORKS_PORT` |
| Policies | 3004 | `POLICIES_PORT` |
| TPRM | 3005 | `TPRM_PORT` |
| Trust | 3006 | `TRUST_PORT` |
| Audit | 3007 | `AUDIT_PORT` |

---

## Frontend Configuration

All frontend variables must be prefixed with `VITE_` to be exposed to the browser.

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://grc.yourcompany.com` | Backend API URL |
| `VITE_KEYCLOAK_URL` | `https://auth.yourcompany.com` | Keycloak server |
| `VITE_KEYCLOAK_REALM` | `gigachad-grc` | Keycloak realm |
| `VITE_KEYCLOAK_CLIENT_ID` | `grc-frontend` | Public client ID |

### Error Tracking

```bash
# Enable Sentry (install @sentry/react first)
VITE_ERROR_TRACKING_ENABLED=true
VITE_SENTRY_DSN=https://xxx@sentry.io/456

# App version for release tracking
VITE_APP_VERSION=1.0.0

# Environment tag
VITE_ENV=production
```

### Feature Flags

```bash
# Enable AI-powered features
VITE_ENABLE_AI_FEATURES=false

# Enable MCP server integration
VITE_ENABLE_MCP_SERVERS=false

# Enable various modules
VITE_ENABLE_TRUST_CENTER=true
VITE_ENABLE_EMPLOYEE_COMPLIANCE=true
VITE_ENABLE_QUESTIONNAIRES=true
```

### Development Options

```bash
# Enable dev authentication bypass
# ⚠️ NEVER enable in production!
VITE_ENABLE_DEV_AUTH=false

# Log level
VITE_LOG_LEVEL=info  # debug | info | warn | error
```

---

## Docker Compose Configuration

When using Docker Compose, environment variables can be set:

### Option 1: .env file in project root

```bash
# .env
DATABASE_URL=postgresql://grc_user:secret@postgres:5432/gigachad_grc
REDIS_URL=redis://redis:6379
NODE_ENV=production
```

### Option 2: environment section in docker-compose.yml

```yaml
services:
  controls:
    environment:
      - DATABASE_URL=postgresql://grc_user:secret@postgres:5432/gigachad_grc
      - NODE_ENV=production
```

### Option 3: env_file directive

```yaml
services:
  controls:
    env_file:
      - .env
      - .env.production
```

---

## Environment Templates

### Development (.env.development)

```bash
NODE_ENV=development
DATABASE_URL=postgresql://grc_user:grc_password@localhost:5432/gigachad_grc
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-backend
STORAGE_PROVIDER=local
LOG_LEVEL=debug
```

### Production (.env.production)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://grc_user:SECURE_PASSWORD@db.yourcompany.com:5432/gigachad_grc
REDIS_URL=redis://:REDIS_PASSWORD@redis.yourcompany.com:6379
KEYCLOAK_URL=https://auth.yourcompany.com
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-backend
KEYCLOAK_CLIENT_SECRET=YOUR_SECRET
STORAGE_PROVIDER=s3
S3_BUCKET=grc-files
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
SENTRY_DSN=https://...@sentry.io/...
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=notifications@yourcompany.com
SMTP_PASSWORD=...
JWT_SECRET=GENERATE_NEW_SECRET
ENCRYPTION_KEY=GENERATE_NEW_KEY
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
```

---

## Cloud Provider Integrations

GigaChad GRC can collect security evidence from major cloud providers. When credentials are not configured, the system operates in **demo mode** with sample data.

### AWS Integration

```bash
# AWS credentials for evidence collection
# Required for: Security Hub findings, CloudTrail events, IAM analysis, S3 security, GuardDuty
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Optional: Use IAM role instead of access keys (recommended for EC2/ECS)
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/GRCReadOnlyRole
```

**Required IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "securityhub:GetFindings",
        "cloudtrail:LookupEvents",
        "config:DescribeComplianceByConfigRule",
        "iam:ListUsers",
        "iam:ListRoles",
        "iam:ListPolicies",
        "iam:ListMFADevices",
        "iam:ListAccessKeys",
        "s3:ListAllMyBuckets",
        "s3:GetBucketEncryption",
        "s3:GetBucketVersioning",
        "s3:GetBucketLogging",
        "s3:GetPublicAccessBlock",
        "guardduty:ListDetectors",
        "guardduty:ListFindings",
        "guardduty:GetFindings",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

**Demo Mode Behavior:** When AWS credentials are not configured, the system returns sample security data with `isMockMode: true` in API responses. A warning is logged: "AWS credentials not configured - using demo mode".

### Azure Integration

```bash
# Azure credentials for Security Center evidence
# Uses Azure Default Credential chain (supports managed identity, CLI, env vars)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

**Required Azure Roles:**
- Security Reader (for Security Center data)
- Reader (for resource enumeration)

**Demo Mode Behavior:** When Azure credentials are not configured or the Azure SDK is not installed, the system returns sample security scores and recommendations with `isMockMode: true`.

### Google Workspace Integration

```bash
# Google Workspace for audit log collection
# Requires a service account with domain-wide delegation
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
GOOGLE_ADMIN_EMAIL=admin@yourcompany.com
GOOGLE_CUSTOMER_ID=C0xxxxxx
```

**Required API Scopes:**
- `https://www.googleapis.com/auth/admin.reports.audit.readonly`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`

**Demo Mode Behavior:** When Google credentials are not configured, the system returns sample audit logs with clear indication that it's operating in demo mode.

---

## Email Service Configuration

Email notifications support multiple providers. The system will fall back to console logging when no provider is configured.

### SMTP (Generic)

```bash
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=notifications@yourcompany.com
SMTP_PASSWORD=your-password
SMTP_FROM=GigaChad GRC <notifications@yourcompany.com>
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
```

### SendGrid

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SMTP_FROM=notifications@yourcompany.com
```

### Amazon SES

```bash
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret
SMTP_FROM=notifications@yourcompany.com
```

**Demo Mode Behavior:** When no email provider is configured, emails are logged to the console instead of being sent. The UI displays a banner indicating "Email notifications are in demo mode" with instructions on how to configure a provider.

---

## Vulnerability Scanning Tools

The vulnerability scanner integrates with external security tools. These are optional dependencies.

### Container Scanning (Trivy)

```bash
# Install Trivy for container vulnerability scanning
# https://aquasecurity.github.io/trivy/
# No environment variables required - uses CLI
```

**Demo Mode Behavior:** If Trivy is not installed, the scanner returns sample vulnerability data with `isMockMode: true` and `toolsRequired: ["trivy"]`.

### Dependency Scanning

```bash
# Uses npm audit for Node.js projects
# Uses pip-audit for Python projects
# No additional configuration required
```

**Demo Mode Behavior:** If the package manager tools are not available, sample vulnerability data is returned.

### Network Scanning (Nmap)

```bash
# Install nmap for network scanning
# https://nmap.org/
# No environment variables required - uses CLI
```

**Demo Mode Behavior:** If Nmap is not installed, sample port scan results are returned with instructions to install the tool.

---

## AI and MCP Server Configuration

### AI Features

```bash
# Enable AI-powered analysis
ENABLE_AI_FEATURES=true

# OpenAI API (for AI analysis)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Or use Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

**Demo Mode Behavior:** When AI is not configured, the risk analysis endpoint returns sample recommendations with `isMockMode: true`. The UI indicates that AI features are running in demo mode.

### MCP Server Credentials

```bash
# Encryption key for MCP credential storage (32+ characters)
MCP_ENCRYPTION_KEY=your-32-character-encryption-key

# Key rotation is supported via API
# POST /api/mcp/credentials/rotate-key
```

---

## Integration Services

### Jira Integration

```bash
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=jira-bot@yourcompany.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=GRC
```

### ServiceNow Integration

```bash
SERVICENOW_INSTANCE=yourcompany.service-now.com
SERVICENOW_USERNAME=integration-user
SERVICENOW_PASSWORD=your-password
```

### Slack Integration

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_DEFAULT_CHANNEL=grc-notifications
```

**Demo Mode Behavior:** When integration credentials are not configured, sync operations log warnings and return mock confirmation responses. The job scheduler continues to run but skips actual external calls.

---

## Demo Mode Summary

GigaChad GRC is designed to operate gracefully when external services are not configured:

| Feature | Required Configuration | Demo Mode Behavior |
|---------|----------------------|-------------------|
| AWS Evidence | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Sample security findings |
| Azure Evidence | Azure credentials | Sample secure scores |
| Google Workspace | Service account JSON | Sample audit logs |
| Email Notifications | SMTP or provider config | Console logging |
| Vulnerability Scanning | Trivy, nmap installed | Sample vulnerabilities |
| AI Analysis | OpenAI/Azure OpenAI key | Sample recommendations |
| Jira Sync | Jira credentials | Mock confirmations |
| ServiceNow Sync | ServiceNow credentials | Mock confirmations |

**Identifying Demo Mode:**
- API responses include `isMockMode: true` when operating without real data
- Console/logs show `WARN` messages indicating demo mode
- UI components display informational banners about configuration status

---

## Generating Secrets

Always generate fresh secrets for production:

```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key
openssl rand -base64 32

# Session Secret
openssl rand -hex 32

# PostgreSQL Password
openssl rand -base64 24 | tr -d '=+/'
```

---

## Validation

Before deploying, validate your configuration:

```bash
# Check required variables are set
./deploy/preflight-check.sh

# Or manually check
[ -z "$DATABASE_URL" ] && echo "❌ DATABASE_URL not set" || echo "✓ DATABASE_URL"
[ -z "$JWT_SECRET" ] && echo "❌ JWT_SECRET not set" || echo "✓ JWT_SECRET"
# ... etc
```

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local overrides
   - Add `*.env*` to `.gitignore`

2. **Use secret management in production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets

3. **Rotate secrets regularly**
   - JWT_SECRET: Quarterly
   - Database passwords: Semi-annually
   - API keys: Annually

4. **Limit access**
   - Use different credentials per environment
   - Principle of least privilege

---

*Last updated: January 2026*

