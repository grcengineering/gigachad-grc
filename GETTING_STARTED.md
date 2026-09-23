# Getting started with GigaChad GRC

This guide covers the supported local evaluation flow on this revision.

## 1. Install prerequisites

Install:

- Docker Desktop or Docker Engine 24+;
- Docker Compose v2; and
- Git.

Allocate at least 8 GB RAM, 4 CPU cores, and 10 GB free disk to Docker. Node.js is only required for local source development, not for the Docker flow below.

Verify Docker:

```bash
docker --version
docker compose version
docker info
```

## 2. Clone and start

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./start.sh
```

On first use, `start.sh` generates `.env`, creates a self-signed local certificate, builds the images, and starts the complete Compose stack.

If `.env` already exists, the script preserves it. An old or placeholder-filled file can prevent startup. Either update it using `.env.example` or, if no data must be preserved:

```bash
./start.sh reset
./start.sh
```

`reset` deletes local volumes and data.

### Windows

`start.bat` is provided for Command Prompt. Before the first run, generate the local certificate from Git Bash or WSL:

```bash
./scripts/generate-dev-certs.sh
```

Then run:

```cmd
start.bat
```

The Windows script generates the same required credentials in `.env` and refuses to continue if the certificate is missing.

## 3. Open the application

Open:

```text
https://localhost
```

Accept the self-signed certificate warning, then click **Dev Login**.

Do not use `http://localhost:3000` as the application URL. That port exposes the frontend container directly and does not provide gateway API routing.

### Local access points

| Service | URL | Credentials |
| --- | --- | --- |
| Application | `https://localhost` | Dev Login |
| Keycloak | `https://auth.localhost` | `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` in `.env` |
| Grafana | `https://grafana.localhost` | `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` in `.env` |
| Prometheus | `https://prometheus.localhost` | None in local Compose |
| RustFS | `http://localhost:9001` | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in `.env` |

Credentials are generated per installation. Shared fixed admin passwords are not used.

## 4. Confirm service health

```bash
./start.sh status
curl http://localhost:3001/health
curl http://localhost:3002/health
```

Swagger is served directly by each API service:

```text
http://localhost:3001/api/docs  Controls
http://localhost:3002/api/docs  Frameworks
http://localhost:3004/api/docs  Policies
http://localhost:3005/api/docs  TPRM
http://localhost:3006/api/docs  Trust
http://localhost:3007/api/docs  Audit
```

The direct ports are loopback-only debugging endpoints. Application traffic should use `https://localhost`.

## 5. Load optional demo data

Demo data is not loaded automatically. The prior in-app load button is not present on this revision.

With the local development stack running:

```bash
curl -k -X POST https://localhost/api/seed/load-demo
```

Check status:

```bash
curl -k https://localhost/api/seed/status
```

The seed endpoints use the local development admin, reject repeated loading into a populated organization, and are disabled in production. To reset demo data without deleting infrastructure:

```bash
curl -k -X POST https://localhost/api/seed/reset \
  -H 'Content-Type: application/json' \
  -d '{"confirmationPhrase":"DELETE ALL DATA"}'
```

See [Demo and sandbox guide](docs/DEMO.md).

## Local-only flags

The canonical local Compose stack deliberately uses:

```env
NODE_ENV=development
VITE_ENABLE_DEV_AUTH=true
VITE_ENABLE_DEV_STUBS=false
```

For explicitly labeled AI mock output in non-production environments, add:

```env
AI_MOCK_MODE=true
```

External connectors do not enter mock mode when credentials are missing. Connection tests and syncs require real provider configuration and may fail when credentials, permissions, upstream APIs, or network egress are unavailable.

## Database initialization

All application services share `services/shared/prisma/schema.prisma`.

The controls container owns schema synchronization. At startup it:

1. runs `prisma db push` against the shared schema; then
2. applies `database/init/12-bcdr-module.sql`.

Do not run a migration from each service. The old numbered SQL files are not a current sequential migration procedure.

## Common commands

```bash
./start.sh          # start/rebuild
./start.sh status   # container status
./start.sh logs     # follow logs
./start.sh stop     # stop, preserve volumes
./start.sh reset    # stop and delete volumes plus .env
```

## Troubleshooting

### A required variable is missing

Your existing `.env` is incomplete. Compare it with `.env.example`, or reset the local installation if its data is disposable.

### Database authentication fails

The PostgreSQL volume was created with different credentials than the current `.env`.

```bash
docker compose down -v
./start.sh
```

This deletes local data.

### A port is already in use

```bash
docker compose ps
lsof -i :3000
lsof -i :443
```

Stop the conflicting process or the older GigaChad stack.

### A page loads without API data

Confirm the browser is using `https://localhost`, not the direct frontend port.

### A connector or AI feature is unavailable

Check [Integration implementation status](docs/INTEGRATION_IMPLEMENTATION_STATUS.md) and [Environment configuration](docs/ENV_CONFIGURATION.md). Provider-backed features require provider credentials and network access; a visible UI entry does not mean the provider is configured.

## Next steps

- [Demo and sandbox guide](docs/DEMO.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Troubleshooting guide](docs/TROUBLESHOOTING.md)
