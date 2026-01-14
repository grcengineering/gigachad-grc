# GigaChad GRC - Quick Start Guide

Get up and running with GigaChad GRC in **one command**.

---

## 🚀 Just Want to Try It?

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./init.sh demo
```

That's it! The script handles everything: environment setup, Docker containers, database initialization, and opens your browser.

**Or try it in your browser** (no install required):

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/grcengineering/gigachad-grc)

---

## Prerequisites

- **Docker Desktop** (v24+) - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

---

## Three Ways to Start

### Option 1: Interactive (Recommended for First Time)

```bash
./init.sh
```

The script will ask what you want to do:
- **Demo Mode** - One-click demo with sample data
- **Dev Mode** - Set up for local development
- **Docker Only** - Start all services in containers
- **Reset** - Clean slate

### Option 2: One-Liner Commands

```bash
# Demo mode - explore the platform
./init.sh demo

# Development mode - sets up local environment
./init.sh dev

# Docker only - all services in containers
./init.sh docker
```

### Option 3: Using Make (if you prefer)

```bash
make demo    # Start demo
make dev     # Development setup
make help    # See all commands
```

---

## What Each Mode Does

### Demo Mode (`./init.sh demo`)

Perfect for exploring the platform:

1. ✅ Creates `.env` with secure secrets
2. ✅ Starts PostgreSQL, Redis, Keycloak, RustFS
3. ✅ Starts all 6 backend services
4. ✅ Starts the frontend
5. ✅ Opens your browser

**Login**: Click "Dev Login" - no password needed!

### Development Mode (`./init.sh dev`)

For contributors and developers:

1. ✅ Creates `.env` with secure secrets
2. ✅ Installs all npm dependencies (8 directories)
3. ✅ Generates Prisma clients
4. ✅ Starts infrastructure (PostgreSQL, Redis, Keycloak, RustFS)

Then start services manually:

```bash
# Terminal 1 - Backend
cd services/controls && npm run start:dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Docker Mode (`./init.sh docker`)

Everything containerized:

1. ✅ Creates `.env` with secure secrets
2. ✅ Starts all infrastructure
3. ✅ Builds and starts all services

---

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Click "Dev Login" |
| **API Docs** | http://localhost:3001/api/docs | - |
| **Keycloak Admin** | http://localhost:8080 | admin / admin |
| **RustFS Console** | http://localhost:9001 | rustfsadmin / (see .env) |
| **Grafana** | http://localhost:3003 | admin / admin |

---

## Loading Demo Data

Once running:

1. Click your profile icon (top-right)
2. Go to **Settings → Organization**
3. Scroll to **Demo Data** section
4. Click **Load Demo Data**

This creates sample controls, risks, frameworks, and evidence.

---

## Common Commands

Using Make:

```bash
make up        # Start containers
make down      # Stop containers
make logs      # View logs (or: make logs s=controls)
make ps        # Show container status
make clean     # Stop and remove volumes
make reset     # Full reset (removes everything)
```

Using Docker Compose:

```bash
docker compose up -d              # Start all
docker compose down               # Stop all
docker compose logs -f controls   # View logs
docker compose ps                 # Status
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres pg_isready -U grc
```

### Reset Everything

```bash
./init.sh reset
```

This removes:
- All Docker containers and volumes
- All `node_modules` directories
- The `.env` file

---

## Next Steps

1. **Explore the UI** - Navigate Controls, Risks, Evidence
2. **Import a framework** - Go to Frameworks and import SOC 2 or ISO 27001
3. **Read the docs** - Check the `/docs` folder for detailed guides

---

## Getting Help

- 📖 [Full Documentation](./docs/)
- 🐛 [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 🚀 [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- 💬 [GitHub Discussions](../../discussions)
