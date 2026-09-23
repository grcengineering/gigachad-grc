![gigachad grc](https://github.com/user-attachments/assets/22d32df8-2e61-420e-bc98-df7c291ac8a4)

# GigaChad GRC

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![Node.js 22.22.3+](https://img.shields.io/badge/Node.js-22.22.3%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

GigaChad GRC is a self-hosted, modular Governance, Risk, and Compliance platform. The repository contains a React frontend, six NestJS API services, PostgreSQL, Redis, Keycloak, RustFS object storage, Traefik, and local monitoring.

> The supported evaluation path on this revision is the local Docker Compose stack. The production Compose file and Helm chart are deployment references that require environment-specific review and configuration. Supabase/Vercel, Gitpod, and GitHub Codespaces are not configured deployment targets in this repository.

## Quick start

### Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- 8 GB RAM and 10 GB free disk minimum
- Git

Node.js is not required for the canonical Docker flow.

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./start.sh
```

`./start.sh`:

1. verifies Docker;
2. creates `.env` with generated local credentials when the file does not exist;
3. creates a self-signed development certificate;
4. runs `docker compose up -d --build`; and
5. opens `https://localhost` on macOS.

If `.env` already exists, it is reused unchanged. Replace placeholders yourself or remove the file and run `./start.sh` again. Never commit `.env`.

The first build can take several minutes. Check progress with:

```bash
./start.sh status
./start.sh logs
```

### Access and credentials

Use the gateway URL for the application:

| Service        | URL                            | Authentication                                              |
| -------------- | ------------------------------ | ----------------------------------------------------------- |
| Application    | `https://localhost`            | Click **Dev Login**                                         |
| Keycloak       | `https://auth.localhost`       | `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` from `.env`    |
| Grafana        | `https://grafana.localhost`    | `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from `.env` |
| Prometheus     | `https://prometheus.localhost` | None in the local stack                                     |
| RustFS console | `http://localhost:9001`        | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `.env`       |

The self-signed certificate causes a browser warning on first use. Direct ports such as `http://localhost:3000` and `http://localhost:8080` are loopback-only debugging endpoints. Port 3000 serves the frontend shell without gateway API routing, so it is not the application URL.

Per-service Swagger documentation is available on direct local ports:

| Service    | Swagger URL                      |
| ---------- | -------------------------------- |
| Controls   | `http://localhost:3001/api/docs` |
| Frameworks | `http://localhost:3002/api/docs` |
| Policies   | `http://localhost:3004/api/docs` |
| TPRM       | `http://localhost:3005/api/docs` |
| Trust      | `http://localhost:3006/api/docs` |
| Audit      | `http://localhost:3007/api/docs` |

The Traefik dashboard is disabled by default. It is not available at port 8090 unless the relevant local environment flags are explicitly enabled.

### Local authentication and mock behavior

The local Compose build intentionally enables development authentication:

- backend services run with `NODE_ENV=development`;
- the frontend is built with `VITE_ENABLE_DEV_AUTH=true`; and
- `VITE_ENABLE_DEV_STUBS` remains disabled.

Development authentication is rejected by the backend in production. It is not a production login mechanism.

External integrations do not silently generate sample evidence when credentials are absent. Configure and test each provider before syncing. AI mock output is opt-in in non-production environments with:

```bash
AI_MOCK_MODE=true
```

Without a configured AI provider or that explicit flag, AI availability varies by module and may return an unavailable error. See [Feature and integration availability](#feature-and-integration-availability).

### Demo data

Demo records are not loaded automatically, and this revision has no active in-app demo-data button. In the local development stack, load them through the controls API:

```bash
curl -k -X POST https://localhost/api/seed/load-demo
```

The endpoint is admin-only, idempotence-protected, and disabled when `NODE_ENV=production`. See [Demo and sandbox guide](docs/DEMO.md).

### Common commands

```bash
./start.sh          # start or rebuild the stack
./start.sh status   # show container status
./start.sh logs     # follow logs
./start.sh stop     # stop containers, preserve data
./start.sh reset    # remove containers, volumes, and generated .env
```

`./scripts/start-demo.sh` is a compatibility wrapper around `./start.sh`; it does not maintain a separate Node/Vite launch path.

## Database schema and startup flow

All services use one Prisma schema:

```text
services/shared/prisma/schema.prisma
```

The Docker startup flow is:

1. PostgreSQL first-boot scripts create supporting databases, extensions, and schemas.
2. The controls container entrypoint runs the committed Prisma baseline and forward-only
   migrations through `deploy/prisma-migrate-safe.sh`.
3. The same entrypoint applies the idempotent BC/DR SQL migration.
4. Other services start against that shared database.

Do not run independent per-service migrations or the numbered `database/init/*.sql` files as an
application migration chain. See [Database schema](docs/DATABASE_SCHEMA.md),
[Database hardening rollout](docs/DATABASE_HARDENING_ROLLOUT.md), and
[Upgrade guide](docs/UPGRADE.md).

## Feature and integration availability

The repository includes UI and API implementations for controls, frameworks, evidence, policies, risks, TPRM, trust, audits, training, BC/DR, and administration. Availability still depends on the selected workflow, permissions, storage, and external providers.

Configuration-required capabilities include:

- Keycloak SSO outside local development;
- SMTP and other outbound notification providers;
- OpenAI or Anthropic for real AI output;
- credentials, scopes, enabled upstream APIs, and network egress for connectors;
- external backup storage for off-host disaster recovery;
- MCP server credentials and any upstream tools they call. The default Controls image packages
  and launches the three repository MCP servers; and
- custom integration code execution, which is disabled unless `ENABLE_CUSTOM_CODE_EXECUTION=true`.

The integration catalog is larger than the set verified end-to-end. A catalog card or factory registration is not a support guarantee. Review [Integration implementation status](docs/INTEGRATION_IMPLEMENTATION_STATUS.md) before relying on a connector.

## Architecture

```text
Browser
  |
  v
Traefik (HTTPS :443)
  |-- Frontend
  |-- Controls API    :3001
  |-- Frameworks API  :3002
  |-- Policies API    :3004
  |-- TPRM API        :3005
  |-- Trust API       :3006
  `-- Audit API       :3007
          |
          +-- PostgreSQL (one shared Prisma schema)
          +-- Redis
          +-- Keycloak
          `-- RustFS
```

## Documentation

- [Getting started](GETTING_STARTED.md)
- [Demo and sandbox](docs/DEMO.md)
- [Deployment status and options](docs/DEPLOYMENT.md)
- [Production deployment](docs/PRODUCTION_DEPLOYMENT.md)
- [Upgrade guide](docs/UPGRADE.md)
- [Environment configuration](docs/ENV_CONFIGURATION.md)
- [Development](docs/DEVELOPMENT.md)
- [API reference](docs/API.md)
- [Help center content](docs/help/README.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

Run documentation validation with:

```bash
npm run validate:docs
```

## License

This project is licensed under the [Elastic License 2.0](LICENSE).

You may use it internally, modify it for your own use, and contribute changes. You may not offer it as a hosted or managed service, sell the software, create a competing commercial product, or remove license notices.
