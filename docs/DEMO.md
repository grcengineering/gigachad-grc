# Demo and sandbox guide

GigaChad GRC can be evaluated locally with the Docker Compose stack and optional seeded records.

## Supported demo path

This repository does not include Gitpod or GitHub Codespaces configuration. The supported demo path on this revision is local Docker:

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./scripts/start-demo.sh
```

`scripts/start-demo.sh` is a compatibility wrapper that delegates to the canonical `./start.sh` Docker flow. It does not install Node dependencies or launch a second Vite process.

You can call the canonical script directly:

```bash
./start.sh
```

## What starts

The local stack includes:

- Traefik;
- PostgreSQL;
- Redis;
- Keycloak;
- RustFS;
- controls, frameworks, policies, TPRM, trust, and audit APIs;
- the built frontend; and
- Prometheus and Grafana.

The script generates local credentials only when `.env` does not already exist. Existing environment files are preserved.

## Application URL

Open `https://localhost`, accept the self-signed certificate warning, and click **Dev Login**.

Do not use `http://localhost:3000` for normal application use. It is the frontend container's direct debugging port and has no gateway API routing.

Administrative credentials are stored in the generated `.env`:

```text
KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD
GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD
MINIO_ROOT_USER / MINIO_ROOT_PASSWORD
```

## Development authentication

The local demo relies on two conditions:

```env
NODE_ENV=development
VITE_ENABLE_DEV_AUTH=true
```

The backend selects the development guard from `NODE_ENV`; the frontend flag only controls whether the Dev Login UI is shown. Development authentication is rejected in production.

`VITE_ENABLE_DEV_STUBS` is false by default so implemented APIs are not replaced with browser-side stub data.

## Load demo records

Seed data is not loaded during startup, and the old in-app demo-data button is not present on this revision.

After the controls service is healthy:

```bash
curl -k -X POST https://localhost/api/seed/load-demo
```

Check status:

```bash
curl -k https://localhost/api/seed/status
```

The seed service creates a multi-tenant sample dataset for the development organization. The exact record counts are implementation details and can change; do not use documentation counts as test assertions.

The endpoint:

- requires an admin context;
- returns a conflict when demo data is already loaded or incompatible data exists; and
- rejects demo mutations when `NODE_ENV=production`.

### Reset seeded records

```bash
curl -k -X POST https://localhost/api/seed/reset \
  -H 'Content-Type: application/json' \
  -d '{"confirmationPhrase":"DELETE ALL DATA"}'
```

This operation is destructive for the current organization. To delete the entire local Docker environment instead:

```bash
./start.sh reset
```

## Mock data is separate from seed data

Seeded demo records and runtime mock behavior are different:

- Seed data is persisted in PostgreSQL by `/api/seed/load-demo`.
- Development authentication is a local login bypass.
- Frontend API stubs remain disabled unless `VITE_ENABLE_DEV_STUBS=true` is explicitly set for isolated UI work.
- Core AI mock output is opt-in with `AI_MOCK_MODE=true` and is ignored in production.
- External integration connectors require real credentials; missing credentials do not create sample evidence.

When evaluating an AI response, check `isMockMode` and `mockModeReason` where that module exposes them. Some module-specific AI paths differ, so do not infer real-provider use solely from a successful response.

## Provider-backed features

The local application starts without every external provider. These capabilities remain configuration-required:

| Capability | Prerequisite |
| --- | --- |
| Real AI analysis | OpenAI or Anthropic key, selected provider, outbound HTTPS |
| Integration sync | Provider credentials, required scopes/APIs, outbound HTTPS |
| Email delivery | SMTP or another implemented email provider |
| SSO | Keycloak realm/client configuration or an operator-managed identity setup |
| Off-host backup | Remote S3 bucket and credentials |
| MCP servers | Build and run the separate packages under `mcp-servers/` |

## Stop or inspect the demo

```bash
./start.sh status
./start.sh logs
./start.sh stop
```

Stopping preserves volumes. Resetting deletes them.

## Troubleshooting

### Dev Login is absent

The frontend flag is baked in at build time. Rebuild the frontend:

```bash
docker compose up -d --build frontend
```

### Seed request is forbidden

Confirm the stack is running with `NODE_ENV=development` and that the request is using local development authentication. Seed mutations are deliberately unavailable in production.

### Seed request reports existing data

Use the status endpoint first. Reset the organization only if its data is disposable.

### Integration sync creates no useful data or fails

Run **Test Connection** first and inspect the service logs. A connector's presence in the catalog does not establish complete provider coverage. See [Integration implementation status](INTEGRATION_IMPLEMENTATION_STATUS.md).

### Application pages fail on port 3000

Use `https://localhost`.

## Related documentation

- [Getting started](../GETTING_STARTED.md)
- [Environment configuration](ENV_CONFIGURATION.md)
- [Integration implementation status](INTEGRATION_IMPLEMENTATION_STATUS.md)
- [Troubleshooting](TROUBLESHOOTING.md)
