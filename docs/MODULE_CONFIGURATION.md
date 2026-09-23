# Module Configuration Guide

This guide explains how to configure GigaChad GRC modules to match your organization's needs. You can enable only the modules you need, reducing complexity and focusing the interface on relevant functionality.

## Table of Contents

1. [Overview](#overview)
2. [Available Modules](#available-modules)
3. [Configuration Presets](#configuration-presets)
4. [Environment Variable Reference](#environment-variable-reference)
5. [How to Configure](#how-to-configure)
6. [Module Dependencies](#module-dependencies)
7. [Behavior When Disabled](#behavior-when-disabled)
8. [Best Practices](#best-practices)

---

## Overview

GigaChad GRC is a modular platform. Each module can be independently enabled or disabled:

- **At deploy time** via environment variables (baseline defaults for all orgs)
- **Per organization in the UI** via the **Module Configuration** settings page

When a module is disabled:

- **Navigation items are hidden** - Users won't see menu items for disabled modules
- **Routes are blocked** - Direct URL access shows a "Module Not Enabled" page
- **Data remains intact** - Disabling a module doesn't delete any data
- **Re-enabling is instant** - Either change the environment variable and restart, or re-enable it in the UI

This allows you to:
- Start with essential modules and expand over time
- Tailor the interface for different use cases
- Reduce cognitive load by hiding irrelevant features
- Create focused deployments for specific compliance needs

---

## Available Modules

### Core Modules (Recommended to Keep Enabled)

| Module | Env Variable | Description | Features |
|--------|--------------|-------------|----------|
| **Compliance** | `VITE_ENABLE_COMPLIANCE_MODULE` | Core compliance management | Controls, Frameworks, Evidence, Compliance Calendar |
| **Data** | `VITE_ENABLE_DATA_MODULE` | Data governance | Policies, Assets, Integrations |

### Risk & Vendor Modules

| Module | Env Variable | Description | Features |
|--------|--------------|-------------|----------|
| **Risk** | `VITE_ENABLE_RISK_MODULE` | Risk management | Risk Dashboard, Risk Register, Heatmap, Scenarios, Reports |
| **TPRM** | `VITE_ENABLE_TPRM_MODULE` | Third-party risk | Vendors, Assessments, Contracts, Questionnaires |

### Governance Modules

| Module | Env Variable | Description | Features |
|--------|--------------|-------------|----------|
| **BC/DR** | `VITE_ENABLE_BCDR_MODULE` | Business continuity | BC/DR Dashboard, Business Processes, Plans, DR Tests, Runbooks, Communication Plans |
| **Audit** | `VITE_ENABLE_AUDIT_MODULE` | Internal audit | Audits, Findings, Audit Requests, Audit Log |

### Trust & People Modules

| Module | Env Variable | Description | Features |
|--------|--------------|-------------|----------|
| **Trust** | `VITE_ENABLE_TRUST_MODULE` | Customer trust | Trust Center, Knowledge Base |
| **People** | `VITE_ENABLE_PEOPLE_MODULE` | Employee compliance | Employee Compliance, Training, Awareness |

### Advanced Modules

| Module | Env Variable | Description | Features |
|--------|--------------|-------------|----------|
| **AI** | `VITE_ENABLE_AI_MODULE` | AI capabilities | AI Risk Analysis, Control Suggestions, MCP Servers |
| **Tools** | `VITE_ENABLE_TOOLS_MODULE` | Additional tools | Custom Dashboards, Scheduled Reports |

---

## Configuration Presets

Choose a preset that matches your use case, or create a custom configuration.

### 🏢 Full Platform

**Use case:** Enterprise organizations needing comprehensive GRC capabilities

```env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
VITE_ENABLE_RISK_MODULE=true
VITE_ENABLE_TPRM_MODULE=true
VITE_ENABLE_BCDR_MODULE=true
VITE_ENABLE_AUDIT_MODULE=true
VITE_ENABLE_TRUST_MODULE=true
VITE_ENABLE_PEOPLE_MODULE=true
VITE_ENABLE_AI_MODULE=false
VITE_ENABLE_TOOLS_MODULE=true
```

---

### 📋 Core GRC

**Use case:** Organizations focused on compliance and risk management without vendor management or BC/DR

```env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
VITE_ENABLE_RISK_MODULE=true
VITE_ENABLE_TPRM_MODULE=false
VITE_ENABLE_BCDR_MODULE=false
VITE_ENABLE_AUDIT_MODULE=true
VITE_ENABLE_TRUST_MODULE=false
VITE_ENABLE_PEOPLE_MODULE=false
VITE_ENABLE_AI_MODULE=false
VITE_ENABLE_TOOLS_MODULE=true
```

**Enabled features:**
- ✅ Controls & Frameworks
- ✅ Evidence management
- ✅ Policy management
- ✅ Asset tracking
- ✅ Risk register & heatmap
- ✅ Internal audits
- ✅ Custom dashboards

**Hidden features:**
- ❌ Vendor management
- ❌ BC/DR planning
- ❌ Trust Center
- ❌ Employee compliance

---

### ✅ Compliance Only

**Use case:** Organizations needing only compliance tracking (controls, frameworks, evidence)

```env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
VITE_ENABLE_RISK_MODULE=false
VITE_ENABLE_TPRM_MODULE=false
VITE_ENABLE_BCDR_MODULE=false
VITE_ENABLE_AUDIT_MODULE=false
VITE_ENABLE_TRUST_MODULE=false
VITE_ENABLE_PEOPLE_MODULE=false
VITE_ENABLE_AI_MODULE=false
VITE_ENABLE_TOOLS_MODULE=false
```

**Enabled features:**
- ✅ Controls & Frameworks
- ✅ Evidence management
- ✅ Policy management
- ✅ Asset tracking
- ✅ Compliance calendar
- ✅ Integrations (for automated evidence)

**Hidden features:**
- ❌ Risk management
- ❌ Vendor management
- ❌ Audits
- ❌ BC/DR
- ❌ Trust Center
- ❌ Employee compliance
- ❌ Custom dashboards

---

### ⚠️ Risk Focused

**Use case:** Risk-centric organizations with vendor oversight needs

```env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
VITE_ENABLE_RISK_MODULE=true
VITE_ENABLE_TPRM_MODULE=true
VITE_ENABLE_BCDR_MODULE=false
VITE_ENABLE_AUDIT_MODULE=false
VITE_ENABLE_TRUST_MODULE=false
VITE_ENABLE_PEOPLE_MODULE=false
VITE_ENABLE_AI_MODULE=false
VITE_ENABLE_TOOLS_MODULE=true
```

---

### 🛡️ Enterprise with BC/DR

**Use case:** Large enterprises requiring business continuity and AI features

```env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
VITE_ENABLE_RISK_MODULE=true
VITE_ENABLE_TPRM_MODULE=true
VITE_ENABLE_BCDR_MODULE=true
VITE_ENABLE_AUDIT_MODULE=true
VITE_ENABLE_TRUST_MODULE=true
VITE_ENABLE_PEOPLE_MODULE=true
VITE_ENABLE_AI_MODULE=true
VITE_ENABLE_TOOLS_MODULE=true
```

> **Note:** AI module requires additional configuration (API keys for OpenAI/Anthropic)

---

## Environment Variable Reference

### All Module Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_COMPLIANCE_MODULE` | `true` | Controls, Frameworks, Evidence, Calendar |
| `VITE_ENABLE_DATA_MODULE` | `true` | Policies, Assets, Integrations |
| `VITE_ENABLE_RISK_MODULE` | `true` | Risk Dashboard, Register, Heatmap, Scenarios |
| `VITE_ENABLE_TPRM_MODULE` | `true` | Vendors, Assessments, Contracts, Questionnaires |
| `VITE_ENABLE_BCDR_MODULE` | `true` | BC/DR Dashboard, Processes, Plans, Tests, Runbooks |
| `VITE_ENABLE_AUDIT_MODULE` | `true` | Audits, Findings, Requests, Audit Log |
| `VITE_ENABLE_TRUST_MODULE` | `true` | Trust Center, Knowledge Base |
| `VITE_ENABLE_PEOPLE_MODULE` | `true` | Employee Compliance, Training |
| `VITE_ENABLE_AI_MODULE` | `false` | AI Features, MCP Servers |
| `VITE_ENABLE_TOOLS_MODULE` | `true` | Custom Dashboards, Scheduled Reports |

### Values

- `true` or `1` — Module is enabled
- `false` or `0` — Module is disabled
- Not set — Uses default value

---

## How to Configure

### Option A – Per-organization (recommended for admins)

Use this when you want to turn modules on/off for a specific customer/org without changing deployment config.

1. Sign in as an **administrator** (admin or super_admin) for the organization.
2. Go to **Settings → Module Configuration** (`/settings/modules`).
3. Choose a **preset** (e.g., Full Platform, Core GRC, Compliance Only) or toggle modules individually.
4. Click **Save Configuration**.

Notes:
- The UI stores module choices per organization.
- Deployment env vars still act as a **baseline**; the org-level config narrows or expands modules relative to that baseline.

### Option B – Deployment defaults (environment variables)

Use this when you want to set **global defaults** for all organizations in an environment.

#### Development (Local)

1. Create or edit `.env.local` in the `frontend/` directory:

```bash
cd frontend
cp env-template.md .env.local  # Start from template
# Edit .env.local with your preferred settings
```

2. Restart the development server:

```bash
npm run dev
```

#### Production (Docker)

1. Set environment variables in your deployment configuration:

**docker-compose.yml:**
```yaml
services:
  frontend:
    environment:
      - VITE_ENABLE_COMPLIANCE_MODULE=true
      - VITE_ENABLE_DATA_MODULE=true
      - VITE_ENABLE_RISK_MODULE=true
      - VITE_ENABLE_TPRM_MODULE=false
      # ... other modules
```

**Or via .env file:**
```bash
# .env
VITE_ENABLE_COMPLIANCE_MODULE=true
VITE_ENABLE_DATA_MODULE=true
...
```

2. Rebuild and restart the frontend container:

```bash
docker compose build frontend
docker compose up -d frontend
```

### Build-Time Configuration

Module settings are baked into the frontend at build time (Vite inlines `VITE_*` variables). To change configuration:

1. Update environment variables
2. Rebuild the frontend (`npm run build` or rebuild Docker image)
3. Deploy the new build

---

## Module Dependencies

Some modules work best when certain other modules are enabled:

| Module | Recommended Companions | Reason |
|--------|----------------------|--------|
| Risk | Compliance | Risk controls can link to compliance controls |
| TPRM | Risk | Vendor risks contribute to overall risk register |
| BC/DR | Data (Assets) | BC/DR plans reference critical assets |
| Audit | Compliance | Audits verify compliance controls |
| Trust | Compliance | Trust Center displays compliance posture |

> **Note:** Modules function independently, but some cross-linking features may be limited if companion modules are disabled.

---

## Behavior When Disabled

### Navigation

Disabled modules are hidden from the sidebar navigation. Users only see modules that are enabled.

**Example: With only Compliance and Data modules enabled:**

```
📊 Dashboard
📁 Compliance
   ├── Controls
   ├── Frameworks
   └── Calendar
📄 Data
   ├── Evidence
   ├── Policies
   ├── Assets
   └── Integrations
⚙️ Settings
```

### Direct URL Access

If a user navigates directly to a disabled module's URL (e.g., bookmarked `/risks`), they see a friendly "Module Not Enabled" page:

- Explains that the module is disabled
- Shows which environment variable controls it
- Provides navigation back to enabled areas

> **Important:** Module flags are **not a security boundary**. They control what is shown and routable in the **frontend UI**.  
> Permissions and API access are still enforced by the backend (Keycloak roles, permission groups, and service guards).  
> Do **not** rely on module flags alone to restrict access for licensing or security-sensitive scenarios.

### Data Preservation

**Disabling a module does NOT delete data.** All records remain in the database. When you re-enable a module:

- All previous data is available
- No migration or restoration needed
- Users can continue where they left off

### API Endpoints

Backend API endpoints remain functional even when frontend modules are disabled. This allows:

- API integrations to continue working
- Future re-enablement without data loss
- External systems to interact with all data

---

## Best Practices

### 1. Start Small, Expand Later

Begin with core modules and add more as your program matures:

```
Phase 1: Compliance + Data (establish baseline)
Phase 2: Add Risk (risk program)
Phase 3: Add TPRM (vendor management)
Phase 4: Add Audit, BC/DR, People (mature program)
```

### 2. Document Your Configuration

Keep a record of which modules you've enabled and why:

```env
# Our Configuration Rationale:
# - Compliance: Core requirement for SOC 2
# - Data: Policy and asset management
# - Risk: Required by our risk framework
# - TPRM: Not needed (no critical vendors)
# - BC/DR: Planned for Q3 2025
```

### 3. Test Configuration Changes

Before changing production configuration:

1. Test in a staging environment
2. Verify navigation changes
3. Check that expected features are visible/hidden
4. Confirm no errors when accessing enabled modules

### 4. Consider User Training

When enabling new modules:

- Announce the change to users
- Provide documentation or training
- Consider a phased rollout for complex modules

### 5. Review Periodically

Reassess your module configuration quarterly:

- Are all enabled modules being used?
- Are there disabled modules that would now be valuable?
- Have your compliance requirements changed?

---

## Troubleshooting

### Module Still Visible After Disabling

**Cause:** Frontend wasn't rebuilt after changing environment variables.

**Solution:** 
- Development: Restart `npm run dev`
- Production: Rebuild and redeploy frontend

### "Module Not Enabled" Page Shows for Enabled Module

**Cause:** Typo in environment variable name or value.

**Solution:** Verify exact variable name and value (`true`, not `TRUE` or `yes`):
```env
# Correct
VITE_ENABLE_RISK_MODULE=true

# Incorrect
VITE_ENABLE_RISK_MODULE=TRUE  # Should be lowercase
VITE_ENABLE_RISKS_MODULE=true  # Wrong name
VITE_ENABLE_RISK_MODULE=yes    # Wrong value
```

### Data Missing After Re-enabling Module

**Cause:** This shouldn't happen - data is preserved.

**Solution:** Check that you're connected to the correct database. Data remains in the database regardless of frontend module settings.

---

## FAQ

**Q: Can I have different module configurations for different users?**

A: Currently, module configuration is instance-wide. All users see the same enabled modules. Role-based access control (RBAC) handles user-specific permissions within enabled modules.

**Q: Does disabling a module improve performance?**

A: Marginally. Disabled modules don't load their code (thanks to lazy loading), but the performance impact of having all modules enabled is minimal.

**Q: Can I disable the Dashboard?**

A: No. Dashboard, Settings, Help, and Account pages are always available.

**Q: What happens to scheduled notifications for disabled modules?**

A: Backend notifications (emails, scheduled jobs) continue to run. Consider pausing notification schedules for disabled modules in Settings → Notifications.

---

## Related Documentation

- [Environment Configuration](./ENV_CONFIGURATION.md) - Full environment variable reference
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [Quick Start](./QUICK_START.md) - Getting started guide

