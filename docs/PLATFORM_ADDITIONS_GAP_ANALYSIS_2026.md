# Platform Additions Gap Analysis 2026

## Purpose

This addendum identifies additional platform improvements that were not explicitly covered in the first-pass deliverables and prioritizes them for execution.

## What Is Net-New vs Existing Deliverables

The first-pass strategy strongly covered CCM, regulatory intelligence, trust automation, TPRM fusion, governed AI, quantification, and federation.  
This addendum adds missing areas in:

- Product-led onboarding and activation
- Ecosystem extensibility and partner motion
- Data lineage/governance as a product capability (not only AI guardrails)
- Admin operability and reliability controls
- Monetization and packaging instrumentation
- Customer-facing assurance APIs and procurement workflows

## Additional P1 Opportunities (0-2 quarters)

### P1-A. Guided Program Onboarding and Maturity Assistant

**Why net-new:** Prior docs focus on operational depth post-adoption; they do not define a structured activation system.

**What to add**

- Guided setup wizard by target outcome (SOC 2, ISO 27001, multi-framework).
- Maturity baseline score and recommended next actions.
- Pre-seeded task packs by role (security, IT, legal, audit).

**Buyer impact**

- SMB/mid-market: faster first value and lower implementation burden.
- Enterprise: standardized rollout playbooks across teams.

**Module ownership**

- Backend: `services/controls/src/`, `services/frameworks/src/`, `services/shared/src/types/`
- Frontend: `frontend/src/pages/`, `frontend/src/components/`

**Success metric**

- Reduce time-to-first-audit-ready project creation by 35%.

### P1-B. Evidence Lineage and Attestation Chain

**Why net-new:** Existing content includes evidence freshness but not end-to-end provenance and lineage visualization.

**What to add**

- Evidence lineage graph: source integration -> transformation -> control usage -> report output.
- Tamper-evident attestation records for imported/generated evidence.
- Exportable assurance package with provenance metadata.

**Buyer impact**

- Enterprise/regulated buyers gain stronger defensibility and audit trust.

**Module ownership**

- Backend: `services/controls/src/evidence/`, `services/shared/src/storage/`, `services/audit/src/`
- Frontend: `frontend/src/pages/Evidence*`, dashboard evidence widgets

**Success metric**

- 50% reduction in auditor follow-up requests tied to evidence origin/validity.

### P1-C. Reliability and Operability Console

**Why net-new:** Prior roadmap references integration health but not a comprehensive GRC ops control plane.

**What to add**

- Central admin console for sync failures, job queues, retries, and stale data alerts.
- One-click remediation actions (retry, backfill, invalidate cache, re-run checks).
- SLO dashboards for connector uptime and collection latency.

**Buyer impact**

- Improves enterprise confidence and lowers support load.

**Module ownership**

- Backend: `services/controls/src/integrations/`, `services/controls/src/collectors/`, `services/shared/src/events/`
- Frontend: admin/settings pages and integration dashboards

**Success metric**

- Reduce integration incident MTTR by 40%.

## Additional P2 Opportunities (2-4 quarters)

### P2-A. Assurance API and Customer-Facing Control Assertions

**Why net-new:** Prior docs focus on trust portal UX, not programmable trust access.

**What to add**

- External assurance API exposing approved control assertions and evidence summaries.
- Fine-grained token scopes and time-bound customer access.
- Contract-aware assertion bundles for procurement reviews.

**Buyer impact**

- Accelerates enterprise procurement workflows and partner integrations.

**Module ownership**

- Backend: `services/trust/src/trust-center/`, `services/shared/src/auth/`, `services/controls/src/controls/`
- Frontend: trust center API key/token management UI

**Success metric**

- 25% reduction in security review cycle time for API-enabled customers.

### P2-B. Partner and Marketplace Extension Framework

**Why net-new:** Existing docs discuss integrations depth, not a partner distribution model.

**What to add**

- Certified integration marketplace with validation checks.
- Partner SDK templates for collectors and workflow actions.
- Version compatibility and deprecation policy controls.

**Buyer impact**

- Expands coverage faster and drives ecosystem-led growth.

**Module ownership**

- Backend: `services/controls/src/integrations/`, `mcp-servers/`, `services/shared/src/types/`
- Frontend: integration catalog pages, partner listing and config UI

**Success metric**

- 2x increase in deployable integrations per year without core-team bottleneck.

### P2-C. Pricing and Value Instrumentation Layer

**Why net-new:** Existing strategy has packaging direction but no telemetry for pricing optimization.

**What to add**

- Feature usage/value telemetry by module and workflow.
- ROI dashboard: hours saved, evidence automation %, questionnaire throughput.
- Plan limit and upgrade trigger framework.

**Buyer impact**

- Better expansion conversion and clearer value realization.

**Module ownership**

- Backend: `services/shared/src/events/`, `services/shared/src/types/`
- Frontend: admin billing/value analytics pages

**Success metric**

- 15% improvement in expansion conversion in multi-module accounts.

## Additional P3 Opportunities (4+ quarters)

### P3-A. Policy-as-Code and Control-as-Code Workspace

**Why net-new:** First-pass items do not include Git-native governance workflows.

**What to add**

- Git-backed policy/control definitions with review workflows.
- Environment promotion model (draft -> staging -> production policy state).
- Drift detection between declared controls and runtime state.

**Buyer impact**

- Enterprise platform teams gain change control and repeatability.

**Module ownership**

- Backend: `services/controls/src/config-as-code/`, `services/policies/src/`, `services/frameworks/src/`
- Frontend: policy/control change review and approvals UI

**Success metric**

- 30% reduction in policy update lead time with full approval traceability.

### P3-B. Benchmarking and Peer Risk Intelligence

**Why net-new:** Existing quantification is internal; no external comparative signal is proposed.

**What to add**

- Anonymous benchmark cohorts by industry/size/framework mix.
- Comparative control maturity and residual risk percentile views.
- Recommended target-state trajectories by cohort.

**Buyer impact**

- Supports board conversations and strategic prioritization.

**Module ownership**

- Backend: `services/frameworks/src/`, `services/tprm/src/`, shared analytics layer
- Frontend: executive dashboard benchmarking views

**Success metric**

- 20% increase in board-level dashboard engagement.

## Prioritization Matrix (Addendum Only)

| Initiative                | Differentiation | Revenue Impact | Time-to-Value | Feasibility | Suggested Priority |
| ------------------------- | --------------- | -------------- | ------------- | ----------- | ------------------ |
| Guided Program Onboarding | High            | High           | Fast          | High        | P1                 |
| Evidence Lineage          | High            | Medium-High    | Fast-Medium   | Medium-High | P1                 |
| Reliability Console       | Medium-High     | High           | Fast          | High        | P1                 |
| Assurance API             | High            | High           | Medium        | Medium      | P2                 |
| Marketplace Framework     | High            | High           | Medium        | Medium      | P2                 |
| Value Instrumentation     | Medium          | High           | Medium        | High        | P2                 |
| Policy-as-Code Workspace  | Very High       | Medium-High    | Medium-Slow   | Medium      | P3                 |
| Benchmarking Intelligence | Medium-High     | Medium         | Medium-Slow   | Medium-Low  | P3                 |

## Risks and Dependencies

- **Data quality dependence:** lineage, quantification, and benchmarking require stable data contracts across services.
- **Permission complexity:** assurance API and marketplace require robust auth scopes and tenancy boundaries.
- **Adoption risk:** onboarding assistant must remain opinionated but configurable to avoid enterprise pushback.

## Recommended Next Action

- Add top three P1 initiatives to the active 90-day roadmap alongside existing P1 items.
- Treat P2 items as scoped discovery + design specs in parallel with Wave 2 delivery.
- Gate P3 items behind architecture readiness checkpoints (data contracts and tenancy model maturity).
