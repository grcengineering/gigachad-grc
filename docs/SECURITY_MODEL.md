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
8. [File Upload Security](#file-upload-security-v110)
9. [SSRF Protection](#ssrf-protection-v120)
10. [Rate Limiting](#rate-limiting-v120)
11. [Log Sanitization](#log-sanitization-v120)
12. [Encryption Security](#encryption-security-v110)
13. [AI & Integration Security](#ai--integration-security)
14. [Custom Code Execution Security](#custom-code-execution-security-v130)
15. [Command Injection Prevention](#command-injection-prevention-v130)
16. [Input Validation Enhancements](#input-validation-enhancements-v130)
17. [Docker Security Hardening](#docker-security-hardening-v130)
18. [Nginx Security Headers](#nginx-security-headers-v130)
    - [Content Security Policy Limitations](#content-security-policy-limitations)
19. [Symlink Protection](#symlink-protection-v130)
20. [Content-Disposition Header Security](#content-disposition-header-security-v130)
21. [Deployment Hardening](#deployment-hardening)
22. [Production Readiness Checklist](#production-readiness-checklist)

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

**Password Policies:**

Password policies must be configured via the Keycloak Admin Console after deployment. Navigate to:

1. Keycloak Admin Console → Realm Settings → Authentication → Password Policy
2. Add the following recommended policies:
   - **Length**: 12 characters minimum
   - **Uppercase Characters**: 1 minimum
   - **Lowercase Characters**: 1 minimum
   - **Digits**: 1 minimum
   - **Special Characters**: 1 minimum
   - **Not Username**: Enabled

> **Note:** Password policies cannot be reliably configured via the realm-export.json file due to Keycloak 25.x import limitations. Configure policies via the Admin UI or REST API.

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
- **Session Storage**: `sessionStorage` for in-memory tokens (frontend)
- **Backend Session Storage**: Redis-backed storage for distributed deployments
- **CSRF Protection**: SameSite cookies, CORS restrictions

#### Redis Session Storage (v1.2.0+)

Backend sessions are now stored in Redis for persistence and scalability:

```typescript
// Session storage configuration
const sessionStore = new RedisSessionStore();
// Sessions automatically expire based on TTL
// User and organization indexes for efficient lookups
```

**Configuration:**

- `REDIS_URL`: Redis connection string (e.g., `redis://localhost:6379`)

**Features:**

- Sessions persist across server restarts
- Works in multi-instance deployments
- Automatic TTL-based expiry
- User and organization session indexing

### Token Revocation (v1.2.0+)

JWT tokens can now be revoked before expiry:

```typescript
// POST /api/auth/logout - Revokes current token
// POST /api/auth/logout-all - Revokes all user tokens
```

**How it works:**

1. Token `jti` (JWT ID) is extracted from the token
2. On logout, the `jti` is added to a Redis blacklist with TTL matching token expiry
3. `JwtAuthGuard` checks the blacklist on every request
4. Blacklisted tokens are rejected even if signature is valid

**Configuration:**

- Requires `REDIS_URL` for blacklist storage
- Tokens are automatically removed from blacklist after they expire

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
  async findAll() {
    /* ... */
  }

  @Post()
  @RequirePermission(Resource.CONTROLS, Action.CREATE)
  async create(@Body() dto: CreateControlDto) {
    /* ... */
  }

  @Delete(':id')
  @RequirePermission(Resource.CONTROLS, Action.DELETE)
  async delete(@Param('id') id: string) {
    /* ... */
  }
}
```

### Permission Groups

Users are assigned to permission groups that bundle related permissions:

| Group              | Description               | Typical Permissions                     |
| ------------------ | ------------------------- | --------------------------------------- |
| Admin              | Full platform access      | All resources, all actions              |
| Compliance Manager | Manage compliance program | Controls, Evidence, Frameworks (CRUD)   |
| Risk Manager       | Manage risk program       | Risk, BCDR (CRUD), Reports (read)       |
| Auditor            | Read-only audit access    | All resources (read), Audit Logs (read) |
| Viewer             | Basic read access         | Dashboard, Controls, Evidence (read)    |

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
if (!(await this.isModuleEnabled(orgId, 'risk'))) {
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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.API_URL],
      },
    },
  })
);
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

## SSRF Protection (v1.2.0+)

Server-Side Request Forgery (SSRF) protection is applied to all outbound HTTP requests with user-controlled URLs.

### Protected Operations

- **Webhooks**: User-configured webhook URLs
- **Custom Integrations**: User-provided API endpoints
- **Collectors**: Evidence collection endpoints

### Validation Rules

```typescript
import { safeFetch, validateUrl } from '@gigachad-grc/shared';

// Validate URL before making request
const result = await validateUrl(userProvidedUrl);
if (!result.valid) {
  throw new Error(result.error);
}

// Or use safeFetch for automatic validation
const response = await safeFetch(userProvidedUrl, options);
```

**Blocked:**

- Private IP ranges: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- Localhost: `127.0.0.1`, `localhost`, `::1`
- Link-local: `169.254.x.x`
- Non-HTTP protocols: `file://`, `ftp://`, etc.
- DNS rebinding attacks (resolved IPs are checked)

**Configurable:**

- `allowedHosts`: Whitelist specific external hosts
- `allowPrivateIPs`: Enable for internal integrations (not recommended)
- `maxRedirects`: Limit redirect chains (default: 5)

---

## Rate Limiting (v1.2.0+)

Sensitive endpoints are protected with rate limiting to prevent abuse.

### Protected Endpoints

| Endpoint Category    | Limit       | Window    |
| -------------------- | ----------- | --------- |
| Exports (PDF, CSV)   | 5 requests  | 1 minute  |
| Bulk Operations      | 10 requests | 1 minute  |
| API Key Management   | 20 requests | 1 hour    |
| File Uploads         | 10 requests | 1 minute  |
| Seed/Demo Data       | 3 requests  | 1 hour    |
| Config Import/Export | 5 requests  | 5 minutes |

### Usage

```typescript
import { EndpointRateLimit, ENDPOINT_RATE_LIMITS } from '@gigachad-grc/shared';

@Post('export')
@EndpointRateLimit(ENDPOINT_RATE_LIMITS.EXPORT)
async exportData() {
  // Rate limited to 5 requests per minute per user
}
```

### Response

When rate limit is exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "retryAfter": 45
}
```

---

## Log Sanitization (v1.2.0+)

Sensitive data is automatically sanitized before logging.

### Sanitized Data Types

- **Email addresses**: `john@example.com` → `joh***@***`
- **JWT tokens**: `Bearer eyJ...` → `Bearer [TOKEN REDACTED]`
- **Passwords/Secrets**: Any key containing `password`, `secret`, `token`, `apiKey` → `[REDACTED]`
- **Stack traces**: Only included in development logs

### Usage

```typescript
import { sanitizeForLogging, maskEmail } from '@gigachad-grc/shared';

// Mask a single email
logger.log(`User logged in: ${maskEmail(user.email)}`);

// Sanitize an entire object
logger.log('Request data:', sanitizeForLogging(requestBody));
```

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
  },
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

| Provider | Auth Method            | Minimum Permissions       |
| -------- | ---------------------- | ------------------------- |
| AWS      | Access Keys / IAM Role | Read-only resource access |
| Azure    | Service Principal      | Reader role               |
| GitHub   | PAT / OAuth App        | `read:org`, repo read     |
| Okta     | API Token              | Read-only Admin           |

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
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    skipPaths: ['/health', '/api/health'],
  })
);
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

## Custom Code Execution Security (v1.3.0+)

Custom integrations can optionally execute user-provided code for data transformation. This feature is **disabled by default** due to security risks.

### Configuration

```bash
# .env - DO NOT enable in production without careful consideration
ENABLE_CUSTOM_CODE_EXECUTION=false  # Default: false
```

### Security Controls

When enabled, custom code execution includes:

1. **Blocklist validation**: Dangerous patterns are blocked:
   - `eval`, `Function`, `require`, `import`
   - Process/child_process access
   - File system access (`fs.`, `readFile`, `writeFile`)
   - Network access (`fetch`, `XMLHttpRequest`, `http.`)
   - Unicode/hex escapes for bypass prevention

2. **Rate limiting**: 10 executions per minute per organization

3. **Logging**: All execution attempts are logged for audit

4. **Sandbox (future)**: Consider `isolated-vm` for true sandboxing

### Recommendation

For production environments, we recommend:

- Keep `ENABLE_CUSTOM_CODE_EXECUTION=false`
- Use visual mode transformations instead
- Review and approve custom code before enabling

---

## Command Injection Prevention (v1.3.0+)

External process spawning (e.g., MCP servers) is protected against command injection.

### Allowed Commands

Only whitelisted commands can be executed:

```typescript
const ALLOWED_MCP_COMMANDS = ['node', 'npx', 'python3', 'python', 'deno', 'bun'];
```

### Argument Validation

Command arguments are validated to block shell metacharacters:

```typescript
// Blocked characters: ; & | ` $ ( ) { } [ ] < >
const dangerousChars = /[;&|`$(){}[\]<>]/;
```

### Usage

```typescript
// MCP server configuration
{
  "command": "node",  // Must be in whitelist
  "args": ["server.js", "--port", "3000"]  // No shell metacharacters
}
```

---

## Input Validation Enhancements (v1.3.0+)

### UUID Path Parameters

All path parameters that expect UUIDs are validated:

```typescript
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  // Invalid UUIDs return 400 Bad Request
}
```

### DTO Validation

DTOs include comprehensive validation:

```typescript
export class CreateVendorDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(50)
  phone?: string;
}
```

### SCIM Filter Sanitization

SCIM filters are restricted to safe characters:

```typescript
@IsOptional()
@MaxLength(500)
@Matches(/^[a-zA-Z0-9\s\.\[\]"'=<>!@\-_,()]+$/)
filter?: string;
```

---

## Docker Security Hardening (v1.3.0+)

### Non-Root User

Dev Dockerfiles run as non-root:

```dockerfile
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

### Security Contexts

Docker Compose services include security contexts:

```yaml
security_opt:
  - no-new-privileges:true
```

### Healthchecks

All services include health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1
```

### Resource Limits

Production deployments should include resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

---

## Nginx Security Headers (v1.3.0+)

The frontend nginx configuration includes comprehensive security headers:

```nginx
# HSTS with preload (only effective when using HTTPS in production)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Permissions Policy (replaces deprecated Feature-Policy)
add_header Permissions-Policy "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), ..." always;

# X-Content-Type-Options - Prevents MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# X-Frame-Options - Clickjacking protection
add_header X-Frame-Options "SAMEORIGIN" always;

# Referrer-Policy - Controls referrer information
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy (Hardened)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.keycloak.* wss://*; frame-src 'self' https://*.keycloak.*; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests;" always;
```

**Note:** The deprecated `X-XSS-Protection` header has been intentionally removed. Modern browsers no longer support it, and in some edge cases it could introduce vulnerabilities. CSP provides superior XSS protection.

### Content Security Policy Limitations

The following CSP directives contain relaxed settings due to external dependencies:

| Directive    | Value             | Reason                                                                                                                                                                               |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `script-src` | `'unsafe-eval'`   | **Required by Monaco Editor**. The Monaco code editor library uses `eval()` for syntax highlighting and code execution features. This is a known limitation documented by Microsoft. |
| `style-src`  | `'unsafe-inline'` | **Required by Recharts and charting libraries**. These libraries dynamically inject styles for responsive charts and animations.                                                     |

**Security Impact Assessment:**

1. **`script-src 'unsafe-eval'`**: While `eval()` can be dangerous, the risk is mitigated because:
   - No user input is passed to Monaco's eval context
   - The code editor is used only for viewing/editing controlled content
   - CSP still blocks inline scripts and external script sources

2. **`style-src 'unsafe-inline'`**: This is a common requirement for many UI libraries. The risk is lower than `script-src 'unsafe-inline'` because:
   - CSS cannot execute JavaScript directly
   - Data exfiltration via CSS is limited and requires specific conditions

**Improvement Roadmap:**

- Monitor Monaco Editor for nonce-based CSP support
- Evaluate alternative charting libraries that support strict CSP
- Consider using CSS-in-JS libraries with nonce support

### Rate Limiting

API requests are rate limited at the nginx level:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
  limit_req zone=api burst=20 nodelay;
  # ...
}
```

---

## Symlink Protection (v1.3.0+)

File storage operations are protected against symlink attacks:

```typescript
// Before any file operation
const stats = await lstat(fullPath);
if (stats.isSymbolicLink()) {
  throw new Error('SECURITY: Symlink access denied');
}
```

This prevents attackers from creating symlinks to escape the storage directory.

---

## Content-Disposition Header Security (v1.3.0+)

Download endpoints sanitize filenames to prevent header injection:

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\r\n\x00-\x1f\x7f]/g, '') // Remove control chars
    .replace(/["\\/]/g, '_'); // Replace problematic chars
}

// Usage
res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(file.name)}"`);
```

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow 90 days for remediation before disclosure

See [SECURITY.md](../SECURITY.md) for the full security policy.
