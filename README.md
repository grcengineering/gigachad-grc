![gigachad grc](https://github.com/user-attachments/assets/22d32df8-2e61-420e-bc98-df7c291ac8a4)

# GigaChad GRC

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A comprehensive, modular, containerized Governance, Risk, and Compliance (GRC) platform built with modern technologies. Manage your entire security program from compliance tracking to risk management, third-party assessments, and external audits.

---

## Quick Start

### Prerequisites

| Requirement        | Minimum    | Notes                                                                                                                                                                                                |
| ------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker Desktop** | v4.0+      | [Download for Mac](https://www.docker.com/products/docker-desktop/) / [Windows](https://www.docker.com/products/docker-desktop/) (requires WSL 2) / Linux: `curl -fsSL https://get.docker.com \| sh` |
| **RAM**            | 8 GB       | 16 GB recommended                                                                                                                                                                                    |
| **CPU**            | 4 cores    | 8 cores recommended                                                                                                                                                                                  |
| **Disk**           | 10 GB free | 20 GB recommended                                                                                                                                                                                    |

> **No Node.js, npm, or other development tools required.** Everything runs inside Docker containers.

### Start the Platform

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./start.sh
```

**Windows users:** Run `start.bat` instead.

`./start.sh` handles everything automatically:

1. Checks that Docker is installed and running
2. Generates a `.env` file with secure random secrets (if one doesn't exist)
3. Builds and starts all containers with `docker compose up -d --build`
4. Opens your browser to `http://localhost:3000`

**First run takes 3-5 minutes** while Docker builds the images. Subsequent starts take ~30 seconds.

### Log In

When the browser opens to `http://localhost:3000`, click the **"Dev Login"** button. No username or password needed. This bypasses Keycloak SSO and uses a local development account.

> **Important:** The Dev Login button only appears when `VITE_ENABLE_DEV_AUTH=true` is set in your `.env` file. The `./start.sh` script sets this automatically. If you created your `.env` manually, you must add this variable yourself.

### Manage the Platform

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `./start.sh`        | Start the platform                         |
| `./start.sh stop`   | Stop all services                          |
| `./start.sh logs`   | View live logs                             |
| `./start.sh status` | Check service health                       |
| `./start.sh reset`  | Stop and remove all containers and volumes |

---

## Manual Setup (Alternative)

If you prefer to run `docker compose` directly instead of using `./start.sh`, you **must** create a valid `.env` file first. The `.env.example` file contains placeholder values that will not work as-is.

### Step 1: Generate Secrets and Create `.env`

```bash
cp .env.example .env
```

Then replace **every placeholder** value in `.env` with real secrets:

```bash
# Generate and replace ENCRYPTION_KEY
openssl rand -hex 32

# Generate and replace JWT_SECRET, SESSION_SECRET
openssl rand -base64 64

# Generate and replace POSTGRES_PASSWORD, REDIS_PASSWORD,
# MINIO_ROOT_PASSWORD, GRAFANA_ADMIN_PASSWORD,
# KEYCLOAK_ADMIN_PASSWORD, PHISHING_TRACKING_SECRET
openssl rand -base64 24
```

After generating your `POSTGRES_PASSWORD`, update the `DATABASE_URL` to match:

```
DATABASE_URL=postgresql://grc:YOUR_GENERATED_PASSWORD@localhost:5433/gigachad_grc
```

Set `VITE_ENABLE_DEV_AUTH=true` to enable the Dev Login button (required for local use without Keycloak HTTPS).

### Step 2: Required Environment Variables

Docker Compose will **refuse to start** if any of these variables are missing or empty:

| Variable                   | Description                       | Example Value             |
| -------------------------- | --------------------------------- | ------------------------- |
| `POSTGRES_USER`            | Database username                 | `grc`                     |
| `POSTGRES_PASSWORD`        | Database password                 | _(generate with openssl)_ |
| `REDIS_PASSWORD`           | Redis password                    | _(generate with openssl)_ |
| `MINIO_ROOT_USER`          | RustFS/S3 storage username        | `rustfsadmin`             |
| `MINIO_ROOT_PASSWORD`      | RustFS/S3 storage password        | _(generate with openssl)_ |
| `KEYCLOAK_ADMIN_PASSWORD`  | Keycloak admin password           | _(generate with openssl)_ |
| `ENCRYPTION_KEY`           | AES encryption key (64 hex chars) | _(generate with openssl)_ |
| `PHISHING_TRACKING_SECRET` | Phishing module signing secret    | _(generate with openssl)_ |
| `GRAFANA_ADMIN_USER`       | Grafana admin username            | `admin`                   |
| `GRAFANA_ADMIN_PASSWORD`   | Grafana admin password            | _(generate with openssl)_ |

### Step 3: Start

```bash
docker compose up -d --build
```

Wait 2-3 minutes on first run, then open `http://localhost:3000`.

---

## Troubleshooting

### `GRAFANA_ADMIN_USER is required` or `GRAFANA_ADMIN_PASSWORD is required`

Your `.env` file is missing Grafana credentials. Add:

```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_password
```

Or use `./start.sh` which generates these automatically.

### Page redirects to `localhost:8080/realms/gigachad-grc/...` and fails

Keycloak requires HTTPS, which is not available in local Docker development. The fix is to use Dev Login mode instead:

1. Set `VITE_ENABLE_DEV_AUTH=true` in your `.env`
2. Rebuild the frontend: `docker compose up -d --build frontend`
3. Open `http://localhost:3000` and use the "Dev Login" button

The `./start.sh` script enables this automatically.

### `Cannot access 'N' before initialization` (recharts error)

This was a Vite code-splitting issue that has been fixed. Pull the latest code:

```bash
git pull origin main
./start.sh
```

### `pull access denied for grc-trust` (or other service)

```
pull access denied for grc-trust, repository does not exist or may require 'docker login'
```

All application services (controls, frameworks, trust, etc.) are built locally from Dockerfiles -- they don't exist on Docker Hub. This error means Docker tried to pull the image instead of building it, which happens when you run `docker compose up` without the `--build` flag.

**Fix:** Use `./start.sh` (which includes `--build` automatically), or run:

```bash
docker compose up -d --build
```

### Port already in use

Another process is using one of the required ports. Check with:

```bash
# macOS/Linux
lsof -i :3000

# Stop existing GigaChad containers
./start.sh stop
```

### Docker is not running

```
Cannot connect to the Docker daemon
```

Start Docker Desktop and wait for it to fully initialize before running `./start.sh`.

### Resetting everything

To completely reset (removes all data, volumes, and containers):

```bash
docker compose down -v
./start.sh
```

> **Warning:** `docker compose down -v` deletes all database data, evidence files, and cached sessions. Run backups first if you have data to preserve.

---

## Access Points

| Service               | URL                            | Credentials       |
| --------------------- | ------------------------------ | ----------------- |
| **Frontend**          | http://localhost:3000          | Click "Dev Login" |
| **Controls API**      | http://localhost:3001/api/docs | Swagger UI        |
| **Frameworks API**    | http://localhost:3002/api/docs | Swagger UI        |
| **Grafana**           | http://localhost:3003          | Set in `.env`     |
| **Policies API**      | http://localhost:3004/api/docs | Swagger UI        |
| **TPRM API**          | http://localhost:3005/api/docs | Swagger UI        |
| **Trust API**         | http://localhost:3006/api/docs | Swagger UI        |
| **Audit API**         | http://localhost:3007/api/docs | Swagger UI        |
| **Keycloak Admin**    | http://localhost:8080          | Set in `.env`     |
| **Traefik Dashboard** | http://localhost:8090          | None              |
| **RustFS Console**    | http://localhost:9001          | Set in `.env`     |
| **Prometheus**        | http://localhost:9090          | None              |
| **PostgreSQL**        | localhost:5433                 | Set in `.env`     |
| **Redis**             | localhost:6380                 | Set in `.env`     |

---

## System Requirements

### Minimum (development/demo)

- Docker Desktop 4.0+
- 8 GB RAM, 4 CPU cores, 10 GB disk
- macOS, Windows (WSL 2), or Linux

### Recommended (development)

- 16 GB RAM, 8 cores, 20 GB disk
- SSD storage for faster Docker builds

### Production

See the [Deployment Guide](docs/DEPLOYMENT.md) and [Production Deployment Checklist](docs/PRODUCTION_DEPLOYMENT.md).

---

## Platform Overview

GigaChad GRC is a complete enterprise GRC solution organized into specialized modules:

| Module                      | Description                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Compliance**              | Controls library, framework readiness (SOC 2, ISO 27001, NIST CSF, PCI DSS, HIPAA), evidence collection, cross-framework mapping |
| **Risk Management**         | Risk register, likelihood/impact scoring, heatmaps, treatment tracking, scenario modeling, risk workflows                        |
| **Policies**                | Policy lifecycle management with versioning, approval workflows, review scheduling                                               |
| **Third-Party Risk (TPRM)** | Vendor management, security assessments, contract lifecycle, SLA tracking                                                        |
| **Trust**                   | Security questionnaires, knowledge base, public-facing trust center portal                                                       |
| **Audit**                   | Internal/external audit management, evidence requests, findings, auditor portal, FieldGuide integration                          |
| **Tools**                   | Security awareness training, phishing simulations, certificate management                                                        |
| **AI & Automation**         | AI-powered risk scoring, auto-categorization, smart search, MCP server integration                                               |
| **Integrations**            | AWS, Azure, GitHub, Okta, Google Workspace, Jamf, and 40+ connectors for automated evidence collection                           |
| **Administration**          | User management, RBAC, audit logging, risk configuration, system health monitoring                                               |

For detailed module documentation including API endpoints, see the [API Reference](docs/API.md).

---

## Architecture

```
                           ┌─────────────────────────────────┐
                           │       Traefik API Gateway       │
                           │         (Ports 80/443)          │
                           └──────────┬──────────────────────┘
                                      │
          ┌───────────┬───────────┬────┴────┬───────────┬───────────┬───────────┐
          │           │           │         │           │           │           │
     Controls    Frameworks   Policies    TPRM       Trust       Audit     Frontend
      :3001        :3002       :3004     :3005      :3006       :3007       :3000
          │           │           │         │           │           │
          └───────────┴───────────┴────┬────┴───────────┴───────────┘
                                       │
                              Shared Library
                    (Prisma, Auth, Storage, Events, Types)
                                       │
               ┌───────────┬───────────┼───────────┐
               │           │           │           │
          PostgreSQL     Redis     Keycloak     RustFS
            :5433        :6380      :8080     :9000/:9001
```

### Tech Stack

- **Backend**: Node.js 20 + TypeScript with NestJS
- **Frontend**: React + TypeScript with Vite, TailwindCSS
- **Database**: PostgreSQL 16 with Prisma ORM
- **Authentication**: Keycloak (SSO, RBAC) with dev-mode bypass
- **API Gateway**: Traefik v3
- **Cache**: Redis
- **Storage**: RustFS (S3-compatible, Apache 2.0 -- [github.com/rustfs/rustfs](https://github.com/rustfs/rustfs))
- **Monitoring**: Prometheus + Grafana
- **Containers**: Docker with Docker Compose

---

## Documentation

### Getting Started

| Document                                        | Description                                                |
| ----------------------------------------------- | ---------------------------------------------------------- |
| **[Getting Started Guide](GETTING_STARTED.md)** | Complete setup guide with screenshots for all skill levels |
| [Quick Start Guide](docs/QUICK_START.md)        | Fast-track setup for experienced users                     |
| [Demo & Sandbox](docs/DEMO.md)                  | One-click demo setup with sample data                      |
| [Troubleshooting](docs/TROUBLESHOOTING.md)      | Common issues and solutions                                |

### Core Documentation

| Document                                         | Description                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| [Architecture Guide](docs/ARCHITECTURE.md)       | System architecture, API gateway, microservices, network topology |
| [API Reference](docs/API.md)                     | Complete API documentation with endpoints and examples            |
| [Configuration Reference](docs/CONFIGURATION.md) | Environment variables, service configuration, database            |
| [Development Guide](docs/DEVELOPMENT.md)         | Local setup, project structure, coding standards, testing         |
| [Deployment Guide](docs/DEPLOYMENT.md)           | Production deployment, CI/CD, monitoring, backups                 |
| [Database Schema](docs/DATABASE_SCHEMA.md)       | All Prisma models, enums, and entity relationships                |
| [Shared Library](services/shared/README.md)      | Auth, storage, events, utils, and shared types                    |

### Security

| Document                                         | Description                                  |
| ------------------------------------------------ | -------------------------------------------- |
| [Security Policy](SECURITY.md)                   | Vulnerability reporting and policies         |
| [Security Model](docs/SECURITY_MODEL.md)         | Authentication, authorization, and hardening |
| [Permissions Matrix](docs/PERMISSIONS_MATRIX.md) | Role-based access control definitions        |

### Operations

| Document                                               | Description                              |
| ------------------------------------------------------ | ---------------------------------------- |
| [Environment Configuration](docs/ENV_CONFIGURATION.md) | Detailed environment variable reference  |
| [Module Configuration](docs/MODULE_CONFIGURATION.md)   | Enable/disable platform modules          |
| [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md) | Production-ready deployment checklist    |
| [Remote Deployment](docs/REMOTE_DEPLOYMENT.md)         | Deploying on remote servers, VMs, or LAN |
| [Monitoring](monitoring/README.md)                     | Prometheus + Grafana setup               |

---

## Project Structure

```
gigachad-grc/
├── frontend/                 # React SPA (Vite + TailwindCSS)
├── services/
│   ├── shared/               # Shared library (Prisma, auth, storage, types)
│   ├── controls/             # Controls, evidence, integrations, risk, audit logging
│   ├── frameworks/           # Framework assessments and readiness
│   ├── policies/             # Policy lifecycle management
│   ├── tprm/                 # Vendor risk, assessments, contracts
│   ├── trust/                # Questionnaires, knowledge base, trust center
│   └── audit/                # Audit management, findings, auditor portal
├── mcp-servers/              # MCP server integrations (evidence, compliance, AI)
├── gateway/                  # Traefik API gateway configuration
├── monitoring/               # Prometheus + Grafana configuration
├── deploy/                   # Production deployment configs
├── terraform/                # Infrastructure as Code
├── docker-compose.yml        # Container orchestration
├── .env.example              # Environment variable template
├── start.sh                  # One-command startup script
└── start.bat                 # Windows startup script
```

---

## License

This project is licensed under the **Elastic License 2.0 (ELv2)**.

**You CAN:** Use internally for commercial purposes, modify for your own use, self-host, contribute improvements.

**You CANNOT:** Offer as a hosted/managed service, sell the software, create a competing commercial product, remove license notices.

See [LICENSE](LICENSE) for complete terms.

## Contributing

We welcome contributions. Please read the [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the [coding standards](CONTRIBUTING.md#coding-standards)
4. Run tests (`npm test`)
5. Submit a pull request

## Support

- **Documentation**: [docs/](./docs)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Security**: [Report vulnerabilities](../../security/advisories/new)
