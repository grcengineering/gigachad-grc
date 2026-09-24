# API reference

The running services generate the authoritative OpenAPI documents. This file documents discovery, routing, and authentication conventions rather than duplicating every DTO.

## Live Swagger documents

Local Docker exposes each service on a loopback debugging port:

| Service    | Swagger                          |
| ---------- | -------------------------------- |
| Controls   | `http://localhost:3001/api/docs` |
| Frameworks | `http://localhost:3002/api/docs` |
| Policies   | `http://localhost:3004/api/docs` |
| TPRM       | `http://localhost:3005/api/docs` |
| Trust      | `http://localhost:3006/api/docs` |
| Audit      | `http://localhost:3007/api/docs` |

Use those documents for request bodies, query parameters, response shapes, and role requirements on the running revision.

## Base URL

The local application origin is:

```text
https://localhost
```

API paths are same-origin:

```text
https://localhost/api/controls
https://localhost/api/frameworks
https://localhost/api/policies
```

The self-signed local certificate requires browser trust or `curl -k`. Direct service ports are for local debugging and Swagger, not public deployment.

Production base URLs are deployment-defined. No hosted `api.gigachad-grc.com` service is supplied by this repository.

## Authentication

### Local development

The canonical local Compose stack runs backends with `NODE_ENV=development` and builds the frontend with `VITE_ENABLE_DEV_AUTH=true`.

```bash
curl -k https://localhost/api/controls
```

The development guard injects a local admin context. It cannot be enabled in production.

### Production

Production uses the configured JWT or persisted API-key path. Obtain JWTs through the deployment's Keycloak/OpenID Connect flow or create API keys through the authenticated account workflow.

Do not send `x-user-id` or `x-organization-id` as a substitute for authentication. Those values are derived or validated by the backend/proxy path.

There is no generic email/password endpoint at `/api/auth/login`.

## Verified route groups

The current gateway routes include:

```text
/api/controls
/api/evidence
/api/frameworks
/api/mappings
/api/policies
/api/vendors
/api/vendor-assessments
/api/contracts
/api/questionnaires
/api/knowledge-base
/api/trust-center
/api/audits
/api/findings
/api/risks
/api/integrations
```

Controls also has a gateway catch-all for other implemented `/api` controllers. Use Swagger to verify exact paths.

## Health

Each service exposes direct health routes:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
```

`/health/live` and `/health/ready` are also implemented by the shared health controller where included.

The local gateway does not route the bare `/health` path to a backend; use a direct loopback port for local service health.

## Example reads

```bash
curl -k https://localhost/api/controls
curl -k https://localhost/api/evidence/stats
curl -k https://localhost/api/frameworks
curl -k 'https://localhost/api/risks?page=1&limit=20'
curl -k https://localhost/api/audits
curl -k https://localhost/api/integrations/types
```

## Demo seed endpoints

Development only:

```bash
curl -k https://localhost/api/seed/status
curl -k -X POST https://localhost/api/seed/load-demo
```

Seed mutations are admin-only and rejected in production.

## Integrations

Catalog metadata does not guarantee a verified connector. Test the upstream account, run a manual sync, inspect connector errors, and compare the evidence with the provider.

See [Integration implementation status](INTEGRATION_IMPLEMENTATION_STATUS.md).

## MCP

MCP servers remain independent stdio packages under `mcp-servers/`, but the default Controls image
builds, packages, and launches all three. Controls exposes authenticated `/api/mcp/*` management and
workflow routes; upstream integrations and AI tools still require their documented credentials.

## API change policy

The APIs are currently unversioned. Treat endpoint and DTO changes as potentially breaking, regenerate clients from live OpenAPI, and pin clients to a tested application revision.
