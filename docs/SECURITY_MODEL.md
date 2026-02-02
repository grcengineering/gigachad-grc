# GigaChad GRC Security Model

This document provides a comprehensive overview of the security architecture, authentication mechanisms, authorization controls, and best practices implemented in the GigaChad GRC platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Module Configuration Security](#module-configuration-security)
5. [Tenant Isolation](#tenant-isolation)
6. [Audit Logging](#audit-logging)
7. [Frontend Security](#frontend-security)
8. [Deployment Hardening](#deployment-hardening)
9. [Production Readiness Checklist](#production-readiness-checklist)

---

## Architecture Overview

### Defense in Depth

The platform implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN / WAF Layer                         │
│              (Cloudflare, AWS CloudFront)                   │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway (Traefik)                    │
│         Rate Limiting, TLS Termination, Routing             │
├─────────────────────────────────────────────────────────────┤
│                  Authentication Layer                       │
│         Keycloak OAuth 2.0 / OIDC, JWT Validation           │
├─────────────────────────────────────────────────────────────┤
│                  Authorization Layer                        │
│      Permission Guards, RBAC, Resource-Level Access         │
├─────────────────────────────────────────────────────────────┤
│                   Application Layer                         │
│          Input Validation, Business Logic                   │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                              │
│     Tenant Isolation, Encryption at Rest, Audit Logs        │
└─────────────────────────────────────────────────────────────┘
```

### Network Segmentation

- **Public Zone**: CDN, Load Balancer
- **DMZ**: API Gateway, Authentication Services
- **Application Zone**: Backend Services (Controls, Frameworks, etc.)
- **Data Zone**: PostgreSQL, Redis, RustFS (Object Storage)

---

## Authentication

### Production Authentication (Keycloak)

In production, the platform uses **Keycloak** for OAuth 2.0 / OpenID Connect authentication:

```typescript
// Frontend authentication flow
const keycloakConfig = {
  url: process.env.VITE_KEYCLOAK_URL,
  realm: process.env.VITE_KEYCLOAK_REALM,
  clientId: process.env.VITE_KEYCLOAK_CLIENT_ID,
};
```

**Token Flow:**
1. User redirected to Keycloak login
2. Keycloak issues JWT access token and refresh token
3. Frontend stores tokens in `sessionStorage` (via `secureStorage`)
4. API requests include `Authorization: Bearer <token>`
5. Backend validates JWT signature and claims

### Development Authentication (DevAuthGuard)

For local development without Keycloak, the `DevAuthGuard` provides a mock user context:

```typescript
@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // CRITICAL: Prevent usage in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DevAuthGuard cannot be used in production');
    }
    
    // Inject mock user context
    request.user = mockUserContext;
    return true;
  }
}
```

**⚠️ Security Warning:** The `DevAuthGuard` explicitly throws an error if `NODE_ENV=production` to prevent accidental exposure.

### Session Management

- **Access Token Lifetime**: 5 minutes (configurable in Keycloak)
- **Refresh Token Lifetime**: 30 minutes (configurable)
- **Session Storage**: `sessionStorage` for in-memory tokens
- **CSRF Protection**: SameSite cookies, CORS restrictions

### Proxy Authentication (v1.1.0+)

When using an authentication proxy, the backend validates proxy-set headers with additional security:

```typescript
// AuthGuard validates proxy requests
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 1. Verify proxy secret (if configured)
    if (process.env.AUTH_PROXY_SECRET) {
      // Uses timing-safe comparison to prevent timing attacks
      verifyProxySecret(request.headers['x-proxy-secret']);
    }
    
    // 2. Validate UUID format for user/org IDs
    // Prevents SQL injection and malformed input
    validateUUID(request.headers['x-user-id']);
    validateUUID(request.headers['x-organization-id']);
    
    return true;
  }
}
```

**Configuration:**
- `AUTH_PROXY_SECRET`: Shared secret between auth proxy and backend
- `REQUIRE_PROXY_AUTH`: When `true`, requests without valid proxy secret are rejected

**Security Features:**
- **Timing-safe comparison**: Prevents timing attacks on secret verification
- **UUID validation**: Ensures user and organization IDs are valid UUIDs
- **Production warnings**: Logs warning if no proxy secret is configured in production

---

## Authorization

### Role-Based Access Control (RBAC)

The platform implements fine-grained RBAC with the following components:

#### Resources
```typescript
enum Resource {
  CONTROLS = 'controls',
  EVIDENCE = 'evidence',
  POLICIES = 'policies',
  FRAMEWORKS = 'frameworks',
  INTEGRATIONS = 'integrations',
  AUDIT_LOGS = 'audit_logs',
  USERS = 'users',
  PERMISSIONS = 'permissions',
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
  WORKSPACES = 'workspaces',
  RISK = 'risk',
  BCDR = 'bcdr',
  REPORTS = 'reports',
  AI = 'ai',
}
```

#### Actions
```typescript
enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  ASSIGN = 'assign',
}
```

### Permission Guard

API endpoints are protected using the `@RequirePermission` decorator:

```typescript
@Controller('api/controls')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ControlsController {
  
  @Get()
  @RequirePermission(Resource.CONTROLS, Action.READ)
  async findAll() { /* ... */ }
  
  @Post()
  @RequirePermission(Resource.CONTROLS, Action.CREATE)
  async create(@Body() dto: CreateControlDto) { /* ... */ }
  
  @Delete(':id')
  @RequirePermission(Resource.CONTROLS, Action.DELETE)
  async delete(@Param('id') id: string) { /* ... */ }
}
```

### Permission Groups

Users are assigned to permission groups that bundle related permissions:

| Group | Description | Typical Permissions |
|-------|-------------|---------------------|
| Admin | Full platform access | All resources, all actions |
| Compliance Manager | Manage compliance program | Controls, Evidence, Frameworks (CRUD) |
| Risk Manager | Manage risk program | Risk, BCDR (CRUD), Reports (read) |
| Auditor | Read-only audit access | All resources (read), Audit Logs (read) |
| Viewer | Basic read access | Dashboard, Controls, Evidence (read) |

---

## Module Configuration Security

### Organization-Level Module Control

Administrators can enable/disable platform modules per organization:

```typescript
// Stored in Organization.settings JSONB column
{
  "enabledModules": ["compliance", "risk", "tprm", "bcdr", "audit"]
}
```

### Module Guard (Frontend)

The `ModuleGuard` component prevents access to disabled modules:

```tsx
<ModuleGuard moduleId="risk">
  <RiskDashboard />
</ModuleGuard>
```

### API-Level Module Checks

Backend endpoints can verify module status before processing:

```typescript
if (!await this.isModuleEnabled(orgId, 'risk')) {
  throw new ForbiddenException('Risk module is not enabled');
}
```

---

## Tenant Isolation

### Database-Level Isolation

All queries are automatically scoped to the user's organization:

```typescript
// Every query includes organizationId filter
const controls = await this.prisma.control.findMany({
  where: {
    organizationId: user.organizationId,
    deletedAt: null,
  },
});
```

### Middleware Enforcement

A middleware extracts and validates `organizationId` from the JWT:

```typescript
// Headers set by auth layer
request.headers['x-organization-id'] = decodedToken.organizationId;
request.headers['x-user-id'] = decodedToken.sub;
```

### Cross-Tenant Access Prevention

- No API endpoint accepts `organizationId` as a parameter
- Organization context is derived exclusively from authenticated token
- Database constraints enforce foreign key relationships

---

## Audit Logging

### Comprehensive Audit Trail

All significant actions are logged to the `AuditLog` table:

```typescript
await this.auditService.log({
  organizationId: user.organizationId,
  userId: user.userId,
  userEmail: user.email,
  userName: user.name,
  action: 'control.update',
  entityType: 'control',
  entityId: controlId,
  entityName: control.title,
  description: 'Updated control implementation status',
  changes: {
    before: { status: 'not_started' },
    after: { status: 'implemented' },
  },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});
```

### Audit Log Retention

- Default retention: 2 years
- Configurable per organization
- Export capability for compliance

### Tamper Protection

- Audit logs are append-only (no updates/deletes via API)
- Database-level triggers prevent modification
- Optional write-once storage integration (S3 Object Lock)

---

## Frontend Security

### Content Security Policy

```typescript
// Helmet CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
    },
  },
}));
```

### XSS Prevention

- React's built-in escaping
- DOMPurify for user-generated HTML
- No `dangerouslySetInnerHTML` without sanitization

### Secure Token Storage

```typescript
// secureStorage utility
export const secureStorage = {
  setItem: (key: string, value: string) => {
    sessionStorage.setItem(key, value);
  },
  getItem: (key: string) => sessionStorage.getItem(key),
  removeItem: (key: string) => sessionStorage.removeItem(key),
};
```

**Why `sessionStorage`:**
- Cleared when browser tab closes
- Not sent with requests (unlike cookies)
- Isolated per origin

---

## File Upload Security (v1.1.0+)

### Path Traversal Protection

All file storage operations include path traversal protection:

```typescript
// LocalStorageProvider validates all paths
private getFullPath(relativePath: string): string {
  const fullPath = path.resolve(this.basePath, relativePath);
  
  // Reject paths that escape the storage directory
  if (!fullPath.startsWith(this.basePath + path.sep)) {
    throw new Error('SECURITY: Path traversal detected');
  }
  
  return fullPath;
}
```

### Filename Sanitization

Uploaded filenames are sanitized to prevent attacks:

- **Path components removed**: `../../../etc/passwd` → `passwd`
- **Null bytes removed**: `file.txt\x00.exe` → `file.txt.exe`
- **Special characters replaced**: Shell metacharacters, SQL injection characters
- **Length limited**: Maximum 255 characters

### File Validation

The `FileValidatorService` provides comprehensive validation:

- **Dangerous extensions blocked**: `.exe`, `.sh`, `.php`, `.js`, etc.
- **MIME type validation**: Only allowed types per category
- **Magic bytes verification**: Content matches declared type
- **Size limits enforced**: Per-category limits (e.g., 50MB for evidence)
- **Double extension detection**: Flags suspicious patterns like `.pdf.exe`

---

## Encryption Security (v1.1.0+)

### Random Salt per Encryption

Credential encryption now uses random salts instead of hardcoded values:

```typescript
// New format with random salt
private encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16); // Random salt per encryption
  const key = crypto.scryptSync(this.encryptionKey, salt, 32);
  // ... encryption logic
  return `${iv}:${authTag}:${salt}:${encrypted}`; // Salt included in output
}
```

**Benefits:**
- Each encrypted value uses a unique salt
- Prevents rainbow table attacks
- Backwards compatible with existing encrypted data

**Affected Services:**
- Integration credentials
- MCP server credentials
- Notification webhook secrets
- API key secrets

---

## AI & Integration Security

### AI Provider Security

When using OpenAI or Anthropic integrations:

**API Key Protection:**
- API keys encrypted at rest using AES-256
- Keys never exposed in logs, responses, or UI
- Keys stored in encrypted `settings` JSONB column
- Access controlled by `settings:update` permission

**Data Handling:**
- Review what data is sent to AI providers
- Consider data residency requirements
- Understand provider data retention policies
- Use API keys with minimal scope

**Configuration:**
```typescript
// AI configuration is stored securely
const aiConfig = {
  provider: 'openai' | 'anthropic',
  apiKey: encrypted, // Never exposed after saving
  model: 'gpt-5' | 'claude-opus-4.5',
  features: {
    riskScoring: boolean,
    categorization: boolean,
    search: boolean,
  }
};
```

### FieldGuide Integration Security

**OAuth 2.0 Flow:**
- Authorization code flow with PKCE
- Tokens stored encrypted
- Automatic token refresh
- Revocation support

**Webhook Security:**
- Webhook signature verification
- Shared secret validation
- IP allowlist support
- Event logging

### Evidence Collector Security

**Credential Management:**
- Service account credentials encrypted at rest
- Least-privilege access (read-only where possible)
- Credential rotation support
- Access logging

**Supported Authentication:**

| Provider | Auth Method | Minimum Permissions |
|----------|-------------|---------------------|
| AWS | Access Keys / IAM Role | Read-only resource access |
| Azure | Service Principal | Reader role |
| GitHub | PAT / OAuth App | `read:org`, repo read |
| Okta | API Token | Read-only Admin |

### MCP Server Security

**Server Isolation:**
- Each MCP server runs in isolated process
- Network access restricted to localhost
- Resource limits enforced
- Automatic health monitoring

**Tool Execution:**
- All tool calls logged with parameters
- Sensitive parameters redacted in logs
- Permission checks before execution
- Rate limiting per server

---

## Deployment Hardening

### Environment Variables

**Never commit secrets to version control.**

Required production secrets:
- `DATABASE_URL` - PostgreSQL connection string
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret
- `JWT_SECRET` - JWT signing key (if not using Keycloak)
- `ENCRYPTION_KEY` - Data encryption key

### TLS Configuration

- TLS 1.2+ required
- Strong cipher suites only
- HSTS enabled with 1-year max-age

### Rate Limiting

```typescript
// Production rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  skipPaths: ['/health', '/api/health'],
}));
```

### Database Security

- Connection pooling via Prisma
- Prepared statements (SQL injection prevention)
- Least-privilege database user
- Encrypted connections (SSL mode)

---

## Production Readiness Checklist

### Authentication & Authorization
- [ ] Keycloak configured with production realm
- [ ] Client secrets rotated from defaults
- [ ] JWT token lifetimes configured appropriately
- [ ] DevAuthGuard removed or disabled
- [ ] Permission groups defined and assigned

### Network Security
- [ ] TLS certificates installed and valid
- [ ] CORS origins restricted to known domains
- [ ] Rate limiting enabled
- [ ] WAF rules configured (if applicable)

### Data Protection
- [ ] Database encryption at rest enabled
- [ ] Backup encryption enabled
- [ ] Audit log retention configured
- [ ] PII handling documented

### Monitoring & Alerting
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Security event alerts configured
- [ ] Failed login attempt monitoring
- [ ] Unusual access pattern detection

### Compliance
- [ ] Security policy documented
- [ ] Incident response plan defined
- [ ] Data retention policies configured
- [ ] Access reviews scheduled

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow 90 days for remediation before disclosure

See [SECURITY.md](../SECURITY.md) for the full security policy.

