# Demo Data Guide

Get up and running with GigaChad GRC in minutes using our comprehensive demo data. This guide covers how to load, use, troubleshoot, and reset demo data.

## Why Use Demo Data?

Demo data lets you:
- **Explore the platform** without manual setup
- **See realistic examples** of controls, policies, vendors, and risks
- **Test workflows** with pre-configured relationships
- **Evaluate features** before committing to production use

---

## What's Included in Demo Data

When you load demo data, the platform creates a complete GRC environment:

| Category | Records | Description |
|----------|---------|-------------|
| **Controls** | 50+ | Security controls across 10 categories (Access Control, Data Protection, etc.) |
| **Frameworks** | 2 | SOC 2 Type II and ISO 27001:2022 with full requirement hierarchies |
| **Framework Requirements** | 200+ | Detailed requirements mapped to controls |
| **Control Implementations** | 50+ | Varied implementation statuses (Implemented, In Progress, Not Started) |
| **Evidence** | 100+ | Sample documents, screenshots, and certificates |
| **Policies** | 15+ | Security, privacy, HR, and operational policies |
| **Vendors** | 20 | SaaS providers, cloud services, consultants with risk tiers |
| **Vendor Assessments** | 20+ | Completed security assessments |
| **Risks** | 25 | Technical, operational, and compliance risks |
| **Employees** | 50 | With training records and compliance status |
| **Training Records** | 100+ | Completed and pending training assignments |
| **Background Checks** | 50 | Employee verification records |

### Sample Control Categories

| Category | Example Controls |
|----------|------------------|
| Access Control | MFA, PAM, Access Reviews, Password Policy |
| Data Protection | Encryption at Rest/Transit, Backup, Key Management |
| Security Operations | Vulnerability Management, Incident Response, SIEM |
| Network Security | Firewall, IDS/IPS, Segmentation, DDoS Protection |
| Human Resources | Background Checks, Training, Offboarding |
| Vendor Management | Risk Assessment, Contracts, Monitoring |

### Sample Vendors

| Vendor | Category | Risk Tier |
|--------|----------|-----------|
| AWS | Cloud Infrastructure | Low |
| Salesforce | CRM | Medium |
| Slack | Communication | Low |
| ADP | HR/Payroll | Medium |
| Cloudflare | Security | Low |

---

## How to Load Demo Data

There are three ways to load demo data:

### Method 1: Via the User Interface (Recommended)

1. **Log in** to the platform
   - If you see a login page, click the **"Dev Login"** button for instant admin access
   - No username or password required in demo mode

2. **Navigate to Demo Data Settings**
   - Click your profile icon in the top-right corner
   - Select **Settings**
   - Go to the **Organization** tab
   - Scroll to the **Demo Data** section

3. **Load Demo Data**
   - Review the summary of what will be created
   - Click **"Load Demo Data"**
   - Wait for confirmation (typically 10-30 seconds)

4. **Explore!**
   - Navigate to Controls, Vendors, Risks, and other modules
   - All demo data is now available

### Method 2: Via the Onboarding Banner

When you first log in with an empty organization:

1. You'll see a welcome banner at the top of the dashboard
2. Click **"Try with Demo Data"**
3. Demo data loads automatically
4. The banner dismisses and you're ready to explore

### Method 3: Via API

For automated setups or scripting:

```bash
curl -X POST http://localhost:3001/api/seed/load-demo \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: demo-user" \
  -H "X-Dev-Organization-Id: default" \
  -H "X-Dev-Role: admin"
```

**Response:**
```json
{
  "success": true,
  "totalRecords": 650,
  "recordsCreated": {
    "controls": 50,
    "frameworks": 2,
    "vendors": 20,
    "risks": 25,
    ...
  }
}
```

---

## Troubleshooting

### "Dev Login" Button Not Showing

**Cause:** Dev Auth mode is not enabled.

**Solution:**
1. Ensure the environment variable is set:
   ```bash
   VITE_ENABLE_DEV_AUTH=true
   ```

2. If running via Docker Compose, check that the frontend service has this variable

3. If running the frontend manually:
   ```bash
   cd frontend
   VITE_ENABLE_DEV_AUTH=true npm run dev
   ```

4. Restart the frontend after changing environment variables

### "Demo Data is Already Loaded" Error

**Cause:** Demo data was previously loaded for this organization.

**Solution:**
1. Go to **Settings → Organization → Demo Data**
2. Click **"Reset All Data"** first
3. Follow the confirmation process
4. Then load demo data again

### "Only Administrators Can Load Demo Data" Error

**Cause:** Your user account doesn't have admin permissions.

**Solution:**
- Use the **"Dev Login"** button which provides admin access automatically
- Or ask your organization admin to load the demo data

### "Organization Already Has Data" Error

**Cause:** The organization has existing controls, vendors, or other records.

**Solution:**
- Reset all data first via Settings → Organization → Demo Data → Reset
- Or create a new organization/workspace

### Demo Data Loaded But Not Visible

**Cause:** Module permissions or enabled modules may be restricting access.

**Solutions:**

1. **Check enabled modules:**
   - Go to **Settings → Modules**
   - Ensure relevant modules (Controls, Vendors, Risk, etc.) are enabled

2. **Check your permissions:**
   - Go to **Settings → Users**
   - Verify your user has appropriate permission groups

3. **Clear browser cache:**
   - Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or open in an incognito/private window

### API Services Not Responding

**Cause:** Backend services may not be running or healthy.

**Solution:**

1. Check Docker container status:
   ```bash
   docker compose ps
   ```

2. Verify the controls service is healthy:
   ```bash
   curl http://localhost:3001/health
   ```

3. Check service logs:
   ```bash
   docker compose logs controls
   ```

4. Restart services if needed:
   ```bash
   docker compose restart controls
   ```

### Database Connection Errors

**Cause:** PostgreSQL may not be ready or accessible.

**Solution:**

1. Check database is running:
   ```bash
   docker compose ps postgres
   ```

2. Verify database is ready:
   ```bash
   docker compose exec postgres pg_isready -U grc
   ```

3. Check database logs:
   ```bash
   docker compose logs postgres
   ```

---

## Resetting Demo Data

To clear all demo data and start fresh:

### Via the UI

1. Go to **Settings → Organization**
2. Scroll to the **Demo Data** section
3. Click **"Reset All Data"**
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

### What Gets Deleted vs. Preserved

| Deleted | Preserved |
|---------|-----------|
| Controls | User accounts |
| Evidence | Organization settings |
| Policies | System configuration |
| Risks | Audit logs |
| Vendors | Permission groups |
| Employees | |
| Training records | |
| All related mappings | |

---

## Best Practices for Forked Repositories

If you've forked GigaChad GRC, follow these steps for a clean demo data experience:

### Pre-Flight Checklist

1. **Docker is running**
   ```bash
   docker info
   ```

2. **No port conflicts** (3000, 3001, 5433, 6380, 8080, 9000)
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

3. **Clean Docker state** (optional, for fresh start)
   ```bash
   docker compose down -v
   ```

### Recommended First-Time Startup Sequence

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/gigachad-grc.git
cd gigachad-grc

# 2. Start infrastructure first
docker compose up -d postgres redis rustfs

# 3. Wait for database
sleep 10

# 4. Start application services
docker compose up -d controls frameworks policies tprm trust audit

# 5. Wait for API to be ready
until curl -s http://localhost:3001/health; do sleep 2; done

# 6. Start frontend with dev auth
cd frontend
VITE_ENABLE_DEV_AUTH=true npm run dev
```

Or use the one-click demo script:
```bash
./scripts/start-demo.sh
```

### Verifying Services Are Running

```bash
# Check all containers
docker compose ps

# Expected output shows all services as "Up" or "healthy"

# Test API health
curl http://localhost:3001/health

# Test frontend
curl http://localhost:3000
```

---

## Frequently Asked Questions

### Can I modify the demo data?

Yes! Demo data is fully editable. Changes persist until you reset.

### Will demo data affect my production environment?

No. Demo data is organization-scoped. Each organization/workspace has its own data.

### How do I switch from demo to production?

1. Reset the demo data
2. Disable Dev Auth (`VITE_ENABLE_DEV_AUTH=false`)
3. Configure Keycloak authentication
4. Create your real organization data

### Can I load demo data multiple times?

You must reset first before reloading. This prevents duplicate records.

### Is there a way to partially load demo data?

Currently, demo data loads as a complete set. You can delete specific records after loading if needed.

---

## Related Guides

- [First Steps Guide](first-steps.md) - Your first 30 minutes on the platform
- [Navigation Guide](navigation.md) - Understanding the interface
- [Controls Management](../compliance/controls.md) - Working with controls
- [Vendor Management](../vendors/managing-vendors.md) - Managing third-party vendors

