# GigaChad GRC - Demo & Sandbox Guide

This comprehensive guide explains how to run GigaChad GRC in demo mode to explore the platform with realistic sample data—all completely free.

---

## Table of Contents

- [Quick Start Options](#quick-start-options)
- [Prerequisites](#prerequisites)
- [Option 1: One-Click Local Demo](#option-1-one-click-local-demo-recommended)
- [Option 2: Gitpod (Browser-Based)](#option-2-gitpod-browser-based)
- [Option 3: GitHub Codespaces](#option-3-github-codespaces)
- [Option 4: Manual Setup](#option-4-manual-setup)
- [Loading Demo Data](#loading-demo-data)
- [What's Included in Demo Data](#whats-included-in-demo-data)
- [Using Dev Auth Mode](#dev-auth-mode)
- [Exploring the Platform](#exploring-the-platform)
- [Resetting Demo Data](#resetting-demo-data)
- [Troubleshooting](#troubleshooting)

---

## Quick Start Options

| Method | Time to Start | Requirements | Best For |
|--------|---------------|--------------|----------|
| **One-Click Script** | ~3 minutes | Docker Desktop, Node.js | Local evaluation |
| **Gitpod** | ~2 minutes | Web browser only | Quick try without install |
| **GitHub Codespaces** | ~2 minutes | GitHub account | Developers with Codespaces access |
| **Manual Setup** | ~10 minutes | Docker, Node.js | Custom configuration |

---

## Prerequisites

### For Local Demo (Options 1 & 4)

| Requirement | Version | Download |
|-------------|---------|----------|
| **Docker Desktop** | v24.0+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Node.js** | v18+ (v20 recommended) | [nodejs.org](https://nodejs.org/) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |

#### Verify Installation

```bash
# Check Docker
docker --version
# Expected: Docker version 24.x.x or higher

# Check Docker Compose
docker compose version
# Expected: Docker Compose version v2.x.x

# Check Node.js
node --version
# Expected: v18.x.x or v20.x.x

# Check Git
git --version
```

#### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk Space | 5 GB | 10 GB |
| CPU | 2 cores | 4 cores |

### For Browser-Based Demo (Options 2 & 3)

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- GitHub account (for Codespaces)

---

## Option 1: One-Click Local Demo (Recommended)

The fastest way to see GigaChad GRC in action on your local machine.

### Step 1: Clone the Repository

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
```

### Step 2: Run the Demo Script

```bash
./scripts/start-demo.sh
```

### What the Script Does

1. ✅ Verifies Docker is running
2. ✅ Creates `.env` file from template if missing
3. ✅ Starts infrastructure (PostgreSQL, Redis, RustFS)
4. ✅ Waits for database to be ready
5. ✅ Starts all backend API services
6. ✅ Installs frontend dependencies (if needed)
7. ✅ Starts the frontend development server
8. ✅ Opens your browser to `http://localhost:3000`

### Expected Output

```
🚀 GigaChad GRC Demo Launcher
==============================

📦 Starting infrastructure services...
⏳ Waiting for database to be ready...
✓ Database is ready
🏗️ Starting application services...
⏳ Waiting for services to start...
✓ API services are ready
🎨 Starting frontend...
⏳ Waiting for frontend...
✓ Frontend is ready

================================================
🎉 GigaChad GRC Demo is Ready!
================================================

📍 Access Points:
   Frontend:      http://localhost:3000
   API Docs:      http://localhost:3001/api/docs
   Keycloak:      http://localhost:8080 (admin/admin)

🔐 Login:
   Click 'Dev Login' button for instant access

📊 Demo Data:
   Go to Settings > Organization > Load Demo Data
```

### Stopping the Demo

```bash
# Stop all services
docker compose down

# Or press Ctrl+C in the terminal running the script
```

---

## Option 2: Gitpod (Browser-Based)

Try GigaChad GRC instantly in your browser—no installation required.

### Step 1: Open in Gitpod

Click this button or the badge in the README:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/grcengineering/gigachad-grc)

### Step 2: Wait for Environment

Gitpod will:
1. Create a cloud workspace
2. Install all dependencies
3. Start the database and services
4. Open the application preview

### Step 3: Access the Application

- The frontend will open automatically in a preview pane
- Click "Open in Browser" for full-screen access
- Use Dev Login to access the platform

### Gitpod Free Tier

- **50 hours/month** free for open source projects
- No credit card required
- Workspaces auto-stop after 30 minutes of inactivity

---

## Option 3: GitHub Codespaces

Use GitHub's built-in cloud development environment.

### Step 1: Open Codespaces

1. Navigate to the repository on GitHub
2. Click the green **"Code"** button
3. Select the **"Codespaces"** tab
4. Click **"Create codespace on main"**

### Step 2: Wait for Setup

The devcontainer will:
1. Build the development container
2. Install dependencies
3. Start infrastructure services
4. Configure the environment

### Step 3: Start the Application

Once the terminal is ready:

```bash
# Start backend services
docker compose up -d

# Start frontend
cd frontend && npm run dev
```

### Step 4: Access the Application

- Click "Open in Browser" when the port notification appears
- Or go to the "Ports" tab and click the globe icon for port 3000

### Codespaces Free Tier

- **60 hours/month** free for personal accounts
- **90 hours/month** for Pro accounts
- Included with GitHub Teams/Enterprise

---

## Option 4: Manual Setup

For users who want more control over the setup process.

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 2: Start Infrastructure

```bash
# Start database, cache, and storage
docker compose up -d postgres redis rustfs

# Wait for services to be healthy
docker compose ps
```

### Step 3: Configure Environment

Create a `.env` file in the frontend directory:

```bash
cat > frontend/.env.local << EOF
VITE_ENABLE_DEV_AUTH=true
VITE_API_URL=http://localhost:3001
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=gigachad-grc
VITE_KEYCLOAK_CLIENT_ID=grc-frontend
EOF
```

### Step 4: Start Services

**Option A: Docker (All Services)**
```bash
docker compose up -d
```

**Option B: Local Development (Separate Terminals)**

Terminal 1 - Controls API:
```bash
cd services/controls && npm run start:dev
```

Terminal 2 - Frameworks API:
```bash
cd services/frameworks && npm run start:dev
```

Terminal 3 - Frontend:
```bash
cd frontend && VITE_ENABLE_DEV_AUTH=true npm run dev
```

### Step 5: Access the Application

Open `http://localhost:3000` in your browser.

---

## Loading Demo Data

Once the platform is running, load comprehensive sample data to explore all features.

### Method 1: Via the User Interface (Recommended)

1. **Log in** to the platform
   - Click the **"Dev Login"** button on the login page
   - This logs you in as an admin user

2. **Navigate to Demo Data Settings**
   - Click your profile icon (top-right)
   - Go to **Settings** → **Organization**
   - Scroll to the **"Demo Data"** section

3. **Load Demo Data**
   - Review what will be created
   - Click **"Load Demo Data"**
   - Wait for confirmation (~10-30 seconds)

### Method 2: Via API

```bash
# First, get an auth token (if not using dev auth)
# With dev auth, you can use a simple request:

curl -X POST http://localhost:3001/api/seed/load-demo \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: demo-user" \
  -H "X-Dev-Organization-Id: default" \
  -H "X-Dev-Role: admin"
```

### Method 3: Via Database Seed Script

```bash
cd scripts
npm install
npx ts-node seed-database.ts
```

### Verification

After loading, you should see:
- ✅ Controls populated in the Controls page
- ✅ Policies in the Policies module
- ✅ Vendors in Third-Party Risk
- ✅ Risks in the Risk Register
- ✅ Employees in HR Compliance

---

## What's Included in Demo Data

The demo dataset includes realistic sample data across all platform modules:

### Data Summary

| Module | Records | Description |
|--------|---------|-------------|
| **Controls** | 50+ | Security controls across 10 categories |
| **Frameworks** | 3 | SOC 2 Type II, ISO 27001:2022, HIPAA |
| **Policies** | 15+ | Security, privacy, HR, and operational policies |
| **Risks** | 25 | Technical, operational, and compliance risks |
| **Vendors** | 20 | SaaS providers, cloud services, consultants |
| **Employees** | 50 | With training records and compliance status |
| **Assets** | 30+ | Hardware, software, and cloud resources |
| **Audits** | 5 | Internal and external audit records |
| **Evidence** | 100+ | Documents, screenshots, and certificates |

### Control Categories

| Category | Controls | Examples |
|----------|----------|----------|
| **Access Control** | 7 | MFA, PAM, Access Reviews, Password Policy |
| **Data Protection** | 6 | Encryption at Rest/Transit, Backup, Key Management |
| **Security Operations** | 7 | Vulnerability Management, Incident Response, SIEM |
| **Network Security** | 5 | Firewall, IDS/IPS, Segmentation, DDoS Protection |
| **Physical Security** | 3 | Facility Access, Visitor Management, Environmental |
| **Human Resources** | 5 | Background Checks, Training, Offboarding |
| **Vendor Management** | 3 | Risk Assessment, Contracts, Monitoring |
| **Change Management** | 4 | Code Review, Testing, Rollback Procedures |
| **Business Continuity** | 3 | BCP, Disaster Recovery, Recovery Testing |
| **Risk Management** | 3 | Assessment, Treatment, Monitoring |
| **Compliance** | 3 | Monitoring, Audit Support, Policy Management |

### Sample Vendors

| Vendor | Category | Risk Rating |
|--------|----------|-------------|
| AWS | Cloud Infrastructure | Low |
| Salesforce | CRM | Medium |
| Slack | Communication | Low |
| ADP | HR/Payroll | Medium |
| Cloudflare | Security | Low |
| DocuSign | Document Management | Low |

### Sample Risks

| Risk | Category | Impact | Likelihood |
|------|----------|--------|------------|
| Data Breach | Security | High | Medium |
| Vendor Dependency | Operational | Medium | High |
| Compliance Violation | Regulatory | High | Low |
| System Downtime | Availability | Medium | Medium |

---

## Dev Auth Mode

Dev Auth provides instant access without configuring Keycloak authentication.

### How It Works

When `VITE_ENABLE_DEV_AUTH=true` is set:
1. A "Dev Login" button appears on the login page
2. Clicking it bypasses Keycloak authentication
3. You're logged in as a demo admin user

### Enable Dev Auth

**Environment Variable:**
```bash
export VITE_ENABLE_DEV_AUTH=true
```

**In `.env` or `.env.local`:**
```env
VITE_ENABLE_DEV_AUTH=true
```

**In the demo script:** Already enabled automatically.

### Dev Auth User Details

| Property | Value |
|----------|-------|
| User ID | `dev-user-id` |
| Email | `dev@gigachad-grc.local` |
| Role | `admin` |
| Organization | `default` |
| Permissions | Full access to all modules |

### Security Note

⚠️ **Never enable Dev Auth in production!** It bypasses all authentication checks.

The start-demo.sh script enables this automatically for demo purposes only.

---

## Exploring the Platform

After loading demo data, here's a suggested tour:

### 1. Dashboard (Home)

- View compliance posture overview
- Check control implementation status
- See risk heat map

### 2. Controls Module

- Browse 50+ security controls
- View implementation status
- See framework mappings

### 3. Frameworks

- Explore SOC 2, ISO 27001, HIPAA
- View requirements hierarchy
- Check compliance gaps

### 4. Risk Management

- Browse the risk register
- View risk heat map
- Review treatment plans

### 5. Third-Party Risk (TPRM)

- View vendor inventory
- Check risk assessments
- Review vendor tiers

### 6. Policies

- Browse security policies
- View policy versions
- Check acknowledgment status

### 7. Evidence Library

- View uploaded evidence
- Check evidence-control mappings
- Preview documents

### 8. Employee Compliance

- View employee training status
- Check background check records
- Review compliance metrics

### 9. Audits

- View audit history
- Check findings and remediation
- Review audit schedules

### 10. Settings

- Organization configuration
- Demo data management
- User preferences

---

## Resetting Demo Data

Clear all data to start fresh or reload demo data.

### Via the UI

1. Navigate to **Settings** → **Organization** → **Demo Data**
2. Click **"Reset All Data"**
3. Review the data that will be deleted
4. Type `DELETE ALL DATA` exactly as shown
5. Wait for the 5-second countdown
6. Click **"Delete All Data"**

### Via API

```bash
curl -X POST http://localhost:3001/api/seed/reset \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: demo-user" \
  -H "X-Dev-Organization-Id: default" \
  -H "X-Dev-Role: admin" \
  -d '{"confirmationPhrase": "DELETE ALL DATA"}'
```

### What Gets Deleted

| Deleted | Preserved |
|---------|-----------|
| Controls | User accounts |
| Evidence | Organization settings |
| Policies | System configuration |
| Risks | Audit logs |
| Vendors | |
| Employees | |
| Assets | |
| Audits | |
| All related records | |

### Reload Demo Data

After resetting, you can load demo data again:
- Via UI: **Settings** → **Organization** → **Load Demo Data**
- Via API: `POST /api/seed/load-demo`

---

## Troubleshooting

### Demo Script Issues

#### "Docker is not running"

**Solution:** Start Docker Desktop and try again.

```bash
# macOS
open -a Docker

# Then retry
./scripts/start-demo.sh
```

#### "Permission denied" when running script

**Solution:** Make the script executable.

```bash
chmod +x scripts/start-demo.sh
./scripts/start-demo.sh
```

#### Script hangs on "Waiting for database"

**Solution:** Check Docker container status.

```bash
docker compose ps
docker compose logs postgres
```

### Loading Demo Data Issues

#### "Organization already has data"

**Cause:** Data already exists in the organization.

**Solution:** Reset data first, then reload.

#### "Demo data is already loaded"

**Cause:** Demo data was previously loaded.

**Solution:** Reset to reload fresh demo data.

#### "Only administrators can load demo data"

**Cause:** Logged in as non-admin user.

**Solution:** Use Dev Login which provides admin access.

### Dev Login Issues

#### "Dev Login" button not showing

**Cause:** Dev auth not enabled.

**Solution:** 
1. Set `VITE_ENABLE_DEV_AUTH=true`
2. Restart the frontend server

```bash
cd frontend
VITE_ENABLE_DEV_AUTH=true npm run dev
```

#### Dev Login gives error

**Cause:** Backend might not accept dev auth headers.

**Solution:** Ensure backend services are running with dev mode enabled.

### Service Issues

#### "Connection refused" errors

**Cause:** Services not running or wrong ports.

**Solution:**
```bash
# Check what's running
docker compose ps

# Restart all services
docker compose down
docker compose up -d
```

#### Port already in use

**Cause:** Another process using the port.

**Solution:**
```bash
# Find the process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Gitpod/Codespaces Issues

#### Environment won't start

**Solution:** 
1. Try stopping and restarting the workspace
2. Clear browser cache and try again
3. Check Gitpod/Codespaces status page

#### Can't access the application

**Solution:**
1. Check the "Ports" tab for port 3000
2. Ensure port visibility is set to "Public"
3. Click the URL or globe icon to open

---

## Related Documentation

- [Quick Start Guide](./QUICK_START.md) - Full installation guide
- [Development Setup](./DEVELOPMENT.md) - Development environment configuration
- [Configuration Guide](./CONFIGURATION.md) - Environment variables and settings
- [Architecture Guide](./ARCHITECTURE.md) - System architecture overview
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions

---

## Getting Help

- 📖 **Documentation**: Check the `/docs` folder
- 💬 **Discussions**: GitHub Discussions for questions
- 🐛 **Issues**: GitHub Issues for bugs
- 🔒 **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability reporting

---

*Last updated: December 2024*
