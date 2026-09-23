# Quick start

The supported evaluation path is local Docker Compose.

## Prerequisites

- Docker Engine/Desktop 24+
- Docker Compose v2
- Git
- 8 GB RAM and 10 GB free disk minimum

Node.js is not required.

## Start

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./start.sh
```

Open `https://localhost`, accept the self-signed certificate warning, and click **Dev Login**.

`start.sh` generates `.env` credentials only when `.env` does not exist. Keycloak, Grafana, and RustFS credentials are the corresponding values in that file; shared fixed admin passwords are not used.

## Load optional demo data

```bash
curl -k -X POST https://localhost/api/seed/load-demo
```

Demo data is not loaded automatically and the seed endpoint is disabled in production.

## Commands

```bash
./start.sh status
./start.sh logs
./start.sh stop
./start.sh reset
```

`reset` deletes local data, volumes, and `.env`.

## Important URLs

- Application: `https://localhost`
- Keycloak: `https://auth.localhost`
- Grafana: `https://grafana.localhost`
- Prometheus: `https://prometheus.localhost`
- Controls Swagger: `http://localhost:3001/api/docs`

Do not use direct frontend port 3000 as the application URL.

## Unsupported shortcuts

This repository has no Gitpod or GitHub Codespaces configuration. Supabase/Vercel is not an implemented deployment target.

See [Getting started](../GETTING_STARTED.md) for details.
