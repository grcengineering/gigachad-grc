## Permissions Matrix

This document summarizes the default permissions granted to each built-in role.
It reflects the configuration in `services/controls/src/permissions/dto/permission.dto.ts`
and is intended as a human-readable reference for administrators.

> **Note:** This matrix shows default permissions. Actual effective permissions
> may differ if you customize permission groups or add user-specific overrides.

> **Enforced by CI (v1.3.0+).** The role × action matrix below is
> machine-verified on every PR by
> [`frontend/e2e/rbac.spec.ts`](../frontend/e2e/rbac.spec.ts), which
> drives the backend's `RolesGuard` / `PermissionGuard` decorators as
> each of the four seeded fixture users. Breaking the matrix —
> for example, removing a `@Roles(...)` decorator or shipping a new
> mutation route without one — fails the `e2e-tenant-rbac` CI job
> and blocks merge. Cross-tenant isolation is verified in parallel by
> [`tenant-isolation.spec.ts`](../frontend/e2e/tenant-isolation.spec.ts).

---

### Resources and Actions

- **Resources**
  - `controls`, `evidence`, `policies`, `frameworks`, `mappings`, `integrations`, `audit_logs`,
    `users`, `permissions`, `settings`, `dashboard`, `workspaces`,
    `risk`, `bcdr`, `reports`, `ai`
- **Actions**
  - `read`, `create`, `update`, `delete`, `assign`, `approve`, `export`

---

### Administrator

**Description**: Full access to all resources and actions.

| Resource    | Actions                         | Scope      |
|------------|----------------------------------|------------|
| All        | All actions (`read`, `create`, `update`, `delete`, `assign`, `approve`, `export`) | `all` (entire organization) |

Admins can manage everything, including risk, BC/DR, reports, AI features, and permission groups.

---

### Compliance Manager

**Description**: Manage controls, evidence, policies, risk, and BC/DR.

| Resource      | Actions                                  | Scope |
|--------------|-------------------------------------------|-------|
| `controls`   | `read`, `create`, `update`, `assign`     | `all` |
| `evidence`   | `read`, `create`, `update`, `approve`    | `all` |
| `policies`   | `read`, `create`, `update`, `approve`    | `all` |
| `frameworks` | `read`                                   | `all` |
| `mappings`   | `read`, `create`, `update`, `delete`     | `all` |
| `integrations` | `read`                                 | `all` |
| `audit_logs` | `read`                                   | `all` |
| `dashboard`  | `read`                                   | `all` |
| `risk`       | `read`, `create`, `update`               | `all` |
| `bcdr`       | `read`, `create`, `update`               | `all` |
| `reports`    | `read`, `export`                         | `all` |
| `ai`         | `read`                                   | `all` |

---

### Auditor

**Description**: Read-only access with ability to approve evidence and export logs/reports.

| Resource      | Actions                         | Scope |
|--------------|----------------------------------|-------|
| `controls`   | `read`                          | `all` |
| `evidence`   | `read`, `approve`               | `all` |
| `policies`   | `read`                          | `all` |
| `frameworks` | `read`                          | `all` |
| `mappings`   | `read`                          | `all` |
| `audit_logs` | `read`, `export`                | `all` |
| `dashboard`  | `read`                          | `all` |
| `risk`       | `read`                          | `all` |
| `bcdr`       | `read`                          | `all` |
| `reports`    | `read`, `export`                | `all` |

Auditors can generate standard reports but cannot change configuration or entities.

---

### Control Owner

**Description**: Edit assigned controls and link evidence.

| Resource      | Actions                         | Scope         |
|--------------|----------------------------------|---------------|
| `controls`   | `read`, `update`                | `assigned`    |
| `evidence`   | `read`, `create`, `update`      | `owned`       |
| `policies`   | `read`                          | `all`         |
| `frameworks` | `read`                          | `all`         |
| `mappings`   | `read`                          | `all`         |
| `dashboard`  | `read`                          | `all`         |

---

### Viewer

**Description**: Read-only access to non-sensitive data.

| Resource      | Actions                         | Scope |
|--------------|----------------------------------|-------|
| `controls`   | `read`                          | `all` |
| `evidence`   | `read`                          | `all` |
| `policies`   | `read`                          | `all` |
| `frameworks` | `read`                          | `all` |
| `mappings`   | `read`                          | `all` |
| `dashboard`  | `read`                          | `all` |

Viewers cannot modify data, run collectors, execute workflows, or generate exports.

---

### Notes for Administrators

- Use the **Permissions** UI to customize groups or create new ones; this matrix
  describes only the built-in defaults.
- Sensitive operations such as:
  - Running evidence collectors,
  - Executing MCP workflows / AI actions,
  - Managing BC/DR plans,
  - Generating or exporting reports,
  are protected by the corresponding `controls`, `ai`, `bcdr`, and `reports` permissions.
- When in doubt, assign **Auditor** or **Viewer** roles rather than Administrator, then
  add overrides for specific needs.

---

### How to Map Roles to Permissions

When defining custom roles or adjusting defaults, a good workflow is:

1. **Start from a base role**
   - Use one of the built-in groups (Administrator, Compliance Manager, Auditor, Control Owner, Viewer) as a template.
   - Clone or create a new group that is *at most* as powerful as the closest built-in role.

2. **Decide what the persona should do**
   - **View only** → grant `read` on the relevant resources.
   - **Contribute / edit** → add `create` and `update` on those resources.
   - **Approve / sign off** → add `approve` (and sometimes `assign`).
   - **Run or export** → add `export` for things like reports and audit logs.

3. **Map product areas to resources**
   - Controls, implementations, and evidence collectors → `controls`, `evidence`.
   - Risk register, scenarios, and workflows → `risk`.
   - BC/DR plans, tests, and runbooks → `bcdr`.
   - PDF/Excel/summary reports → `reports`.
   - MCP workflows and AI assistants → `ai`.

4. **Use overrides sparingly**
   - Prefer adjusting group permissions over many per-user overrides.
   - Use overrides only for exceptional cases (e.g., a single executive approver needing `risk:update` or `bcdr:update`).

By following this pattern, you keep your permission model understandable while ensuring that powerful actions (collectors, MCP/AI, BC/DR, reporting) are only available to clearly defined roles.


