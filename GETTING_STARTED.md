# Getting Started with GigaChad GRC

This guide will help you get GigaChad GRC running on your computer in under 10 minutes.

---

## Prerequisites

You only need **one thing** installed: **Docker Desktop**

### Step 1: Install Docker Desktop

Docker Desktop is a free application that runs the GigaChad GRC platform.

#### macOS

1. Go to [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Click **"Download for Mac"**
   - Choose **Apple Silicon** if you have an M1/M2/M3 Mac
   - Choose **Intel** if you have an older Mac
3. Open the downloaded `.dmg` file
4. Drag Docker to your Applications folder
5. Open Docker from Applications
6. Wait for Docker to start (you'll see a whale icon in your menu bar)

#### Windows

1. Go to [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Click **"Download for Windows"**
3. Run the installer
4. **Important:** When prompted, ensure "Use WSL 2" is checked
5. Restart your computer if prompted
6. Open Docker Desktop from the Start menu
7. Wait for Docker to start (you'll see a whale icon in your system tray)

> **Windows Note:** You may need to enable virtualization in your BIOS. If Docker won't start, search "enable virtualization [your computer brand]" for instructions.

#### Linux (Ubuntu/Debian)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (logout/login required after)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Step 2: Verify Docker is Running

Open a terminal (or Command Prompt on Windows) and run:

```bash
docker --version
```

You should see something like: `Docker version 24.0.0, build abcdef`

If you see an error, make sure Docker Desktop is running (look for the whale icon).

---

## Configuring Your Environment

Before starting GigaChad GRC, you need to set up your environment configuration.

### Step 3: Create Your Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### Step 4: Generate Secure Secrets

**Important:** You MUST generate unique secrets for your installation. Never use the placeholder values in production.

```bash
# Generate encryption key (64-char hex)
openssl rand -hex 32

# Generate JWT/session secrets (base64)
openssl rand -base64 64

# Generate passwords
openssl rand -base64 24
```

Open your `.env` file and replace the placeholder values:

| Variable                       | How to Generate                      |
| ------------------------------ | ------------------------------------ |
| `ENCRYPTION_KEY`               | `openssl rand -hex 32`               |
| `JWT_SECRET`                   | `openssl rand -base64 64`            |
| `SESSION_SECRET`               | `openssl rand -base64 64`            |
| `POSTGRES_PASSWORD`            | `openssl rand -base64 24`            |
| `REDIS_PASSWORD`               | `openssl rand -base64 24`            |
| `MINIO_ROOT_USER`              | Set a username (e.g., `rustfsadmin`) |
| `MINIO_ROOT_PASSWORD`          | `openssl rand -base64 24`            |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | `openssl rand -base64 32`            |
| `PHISHING_TRACKING_SECRET`     | `openssl rand -base64 32`            |

> **Security Warning:** Never commit your `.env` file to version control. It's already in `.gitignore`, but always double-check before pushing changes.

For production deployments, see `env.example.production` for additional configuration options.

---

## Starting GigaChad GRC

### Option A: Download and Run (Easiest)

#### macOS / Linux

Open Terminal and run:

```bash
# Download the project
git clone https://github.com/grcengineering/gigachad-grc.git

# Go into the folder
cd gigachad-grc

# Create your environment file (REQUIRED)
cp .env.example .env
# Edit .env and replace placeholder values with generated secrets

# Start the application
./start.sh
```

#### Windows

Open Command Prompt or PowerShell and run:

```cmd
# Download the project
git clone https://github.com/grcengineering/gigachad-grc.git

# Go into the folder
cd gigachad-grc

# Create your environment file (REQUIRED)
copy .env.example .env
# Edit .env and replace placeholder values with generated secrets
# Use Git Bash or WSL to run: openssl rand -hex 32

# Start the application
start.bat
```

### What Happens Next

1. **First Run (3-5 minutes):** Docker downloads and builds all the components
2. **You'll see:** Progress messages as each service starts
3. **When ready:** Your browser opens to https://localhost

> **Tip:** Subsequent starts only take 30-60 seconds!

> **Windows note:** `start.bat` doesn't generate the HTTPS certificate automatically. Before your first run, generate it once via Git Bash or WSL: `./scripts/generate-dev-certs.sh`.

---

## Accessing the Application

**Use `https://localhost`, not `http://localhost:3000`.** Port 3000 is the frontend container's direct port - it serves the app's static files only, with no route to the backend APIs, so pages will load with no data (some will error outright). Everything - UI and API - goes through the Traefik gateway at `https://localhost`, which is also the only address Keycloak SSO redirects back to. The certificate is self-signed, so your browser will warn on first visit; click through it (e.g. "Advanced > Proceed").

| Service              | URL                             | Credentials               |
| --------------------- | -------------------------------- | ------------------------- |
| **GigaChad GRC**      | https://localhost                | Click "Dev Login" button  |
| Frontend (direct)     | http://localhost:3000            | UI shell only - no API access |
| API Documentation     | http://localhost:3001/api/docs   | None needed                |
| Keycloak (Auth)       | https://auth.localhost           | admin / admin              |
| Grafana (Monitoring)  | https://grafana.localhost        | admin / admin               |

### How to Log In

1. Go to https://localhost (click through the self-signed certificate warning)
2. Click the green **"Dev Login"** button
3. You're in! No username or password needed for demo mode.

---

## Common Commands

### macOS / Linux

```bash
./start.sh          # Start the application
./start.sh stop     # Stop the application
./start.sh status   # Check if services are running
./start.sh logs     # View live logs (Ctrl+C to exit)
./start.sh reset    # Delete all data and start fresh (fixes auth issues)
```

### Windows

```cmd
start.bat           # Start the application
start.bat stop      # Stop the application
start.bat status    # Check if services are running
start.bat logs      # View live logs (Ctrl+C to exit)
start.bat reset     # Delete all data and start fresh (fixes auth issues)
```

---

## Loading Demo Data

There's currently no in-app button for this (the onboarding screen that used to offer it was removed from the UI in a past refactor). The backend endpoint still works, though - call it directly once you're logged in:

```bash
curl -X POST http://localhost:3001/api/seed/load-demo
```

This loads sample frameworks, controls, evidence, policies, vendors, risks, employees, and audits into your organization. It requires an admin user (Dev Login already qualifies) and only needs to be run once - it returns a 409 if demo data is already loaded. To clear it and start over, `POST /api/seed/reset` with body `{"confirmationPhrase": "DELETE ALL DATA"}`.

---

## Troubleshooting

### Docker isn't running

**Symptom:** Error message about Docker not being found or not running

**Solution:**

1. Look for the Docker whale icon in your menu bar (Mac) or system tray (Windows)
2. If not there, open Docker Desktop from your Applications/Start Menu
3. Wait 30-60 seconds for Docker to fully start
4. Try the command again

### Port already in use

**Symptom:** Error about port 3000, 3001, or another port being in use

**Solution:**

```bash
# Stop any running containers
./start.sh stop

# If that doesn't work, force stop everything
docker compose down -v

# Start fresh
./start.sh
```

### Services won't start (Windows)

**Symptom:** Containers exit immediately or show unhealthy

**Solution:**

1. Open Docker Desktop
2. Go to Settings → Resources
3. Ensure you have at least:
   - **CPUs:** 4
   - **Memory:** 8 GB
   - **Disk:** 20 GB
4. Click "Apply & Restart"

### Database authentication errors (WSL)

**Symptom:** Containers crash with errors like:

- `FATAL: password authentication failed for user "grc"` or `"GRC"`
- `failed to start server in dev mode`
- Keycloak or other services can't connect to PostgreSQL

**Cause:** The PostgreSQL data volume was initialized with different credentials than what's in your current `.env` file. This happens when:

- The `.env` file was deleted and regenerated (new random passwords)
- You cloned the repo fresh but Docker volumes still exist from a previous install
- Environment variables changed after initial setup

**Solution:**

```bash
# Stop all containers and REMOVE ALL VOLUMES (this deletes all data!)
docker compose down -v

# Start fresh - this will create new volumes with matching credentials
./start.sh
```

> **Note:** The `-v` flag removes all Docker volumes, which means any data you had (users, controls, etc.) will be lost. This is fine for development but be careful in production.

**Alternative (preserve data):**
If you need to preserve your data, you can manually update the PostgreSQL password:

```bash
# 1. Check what password is in your .env file
cat .env | grep POSTGRES_PASSWORD

# 2. Connect to PostgreSQL and update the password
docker compose exec postgres psql -U postgres -c "ALTER USER grc WITH PASSWORD 'your-password-from-env';"

# 3. Restart all services
docker compose restart
```

### Slow performance

**Symptom:** Application is sluggish or pages load slowly

**Solution (Mac):**

1. Open Docker Desktop → Settings → Resources
2. Increase Memory to 8GB or more
3. Enable "Use Virtualization Framework" (Apple Silicon)

**Solution (Windows):**

1. Open Docker Desktop → Settings → Resources → WSL Integration
2. Enable integration with your WSL distro
3. Run commands from within WSL for better performance

### Linux Server: "operation not permitted" errors

**Symptom:** Containers show `exec /usr/local/bin/docker-entrypoint.sh: operation not permitted`

This happens on Linux servers with AppArmor or SELinux enabled.

**Solution 1: Disable AppArmor for Docker (Ubuntu/Debian)**

```bash
# Stop AppArmor
sudo systemctl stop apparmor
sudo systemctl disable apparmor

# Restart Docker
sudo systemctl restart docker

# Try again
./start.sh
```

**Solution 2: Disable SELinux for Docker (RHEL/CentOS/Fedora)**

```bash
# Temporarily disable SELinux
sudo setenforce 0

# Or permanently (edit /etc/selinux/config and set SELINUX=permissive)
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config

# Restart Docker
sudo systemctl restart docker

# Try again
./start.sh
```

**Solution 3: Run with elevated privileges (not recommended for production)**

```bash
# Add :z flag to volumes for SELinux
# Or run containers with --privileged flag
docker compose down -v
docker compose up -d --force-recreate
```

### How to completely reset

If something is really broken, start fresh:

```bash
# Stop everything and remove all data
docker compose down -v

# Remove built images
docker rmi $(docker images 'gigachad-grc-*' -q) 2>/dev/null

# Start fresh
./start.sh
```

---

## System Requirements

| Component          | Minimum | Recommended |
| ------------------ | ------- | ----------- |
| **RAM**            | 8 GB    | 16 GB       |
| **CPU**            | 4 cores | 8 cores     |
| **Disk Space**     | 10 GB   | 20 GB       |
| **Docker Desktop** | 4.0+    | Latest      |

### Supported Operating Systems

- ✅ macOS 12+ (Intel or Apple Silicon)
- ✅ Windows 10/11 (with WSL 2)
- ✅ Ubuntu 20.04+
- ✅ Debian 11+
- ✅ Other Linux distributions with Docker

---

## Getting Help

### Built-in Help

- Click the **"?"** icon in the app header
- Visit the **Help Center** from the sidebar
- Press **⌘K** (Mac) or **Ctrl+K** (Windows) for quick search

### Community Support

- [GitHub Issues](https://github.com/grcengineering/gigachad-grc/issues) - Report bugs
- [Discussions](https://github.com/grcengineering/gigachad-grc/discussions) - Ask questions

---

## Next Steps

Once you're up and running:

1. **Explore the Dashboard** - Get an overview of your compliance posture
2. **Browse Framework Library** - Activate SOC 2, ISO 27001, or other frameworks
3. **Review Controls** - See mapped controls and start implementing
4. **Check the Demo Guide** - [docs/DEMO.md](docs/DEMO.md) for a full walkthrough

Welcome to GigaChad GRC! 🏋️
