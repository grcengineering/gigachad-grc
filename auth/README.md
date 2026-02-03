# Keycloak Authentication Configuration

This folder contains the Keycloak realm export for the GigaChad GRC platform.

## Security Configuration Required

### Client Secrets (CRITICAL)

The `realm-export.json` file contains placeholder values for client secrets that **MUST** be replaced before production deployment:

| Client | Placeholder | Environment Variable |
|--------|-------------|---------------------|
| `grc-services` | `${GRC_SERVICES_SECRET}` | `GRC_SERVICES_SECRET` |
| `grc-mcp` | `${GRC_MCP_SECRET}` | `GRC_MCP_SECRET` |

**To configure:**

1. Generate strong secrets (minimum 32 characters, cryptographically random):
   ```bash
   openssl rand -base64 32
   ```

2. Set the environment variables before importing the realm, OR replace the placeholders directly in the JSON file for your deployment.

3. For Docker deployments, add to your `.env` file:
   ```
   GRC_SERVICES_SECRET=your-generated-secret-here
   GRC_MCP_SECRET=your-generated-secret-here
   ```

### Default Users

The realm includes default users for initial setup:

| Username | Role | Default Password |
|----------|------|------------------|
| `admin` | admin | `admin` |
| `compliance_manager` | compliance_manager | `compliance` |
| `auditor` | auditor | `auditor` |

All default passwords are marked as `temporary: true`, meaning users will be forced to change them on first login.

**For production:** Consider removing these default users entirely and creating users through the Keycloak admin console with strong passwords.

### SSL/TLS Configuration

The realm is configured with `sslRequired: "external"`, which means:
- HTTPS is required for all external requests
- HTTP is allowed only for localhost/internal connections
- For production behind a reverse proxy, this is the recommended setting

### Password Policy

The realm enforces the following password policy:
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- Cannot contain username

## Importing the Realm

### Via Keycloak Admin Console

1. Log in to the Keycloak admin console
2. Create a new realm or select an existing one
3. Go to "Realm Settings" > "Partial Import"
4. Upload `realm-export.json`

### Via Docker/Environment Variables

If using Keycloak in Docker, mount this file and set:
```yaml
environment:
  - KEYCLOAK_IMPORT=/opt/keycloak/data/import/realm-export.json
volumes:
  - ./auth/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
```

## Security Checklist

Before going to production, ensure:

- [ ] Client secrets have been replaced with strong, unique values
- [ ] Default user passwords have been changed or users removed
- [ ] HTTPS is properly configured on your reverse proxy
- [ ] Brute force protection settings are appropriate for your use case
- [ ] Event logging is configured to send to your SIEM
