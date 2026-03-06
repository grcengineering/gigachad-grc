# Platform Feature Backlog 2026

## Objective

Provide an execution-ready backlog using a 2x2 (Impact x Effort) model, mapped to current GigaChad GRC modules and code areas.

## Scoring Model

- **Impact:** expected product/business value (1-5).
- **Effort:** implementation complexity/time (1-5).
- **Priority order:** high-impact/low-effort first, then strategic bets.

## 2x2 Backlog Summary

| Quadrant                                    | Initiative                                   | Impact | Effort | Priority |
| ------------------------------------------- | -------------------------------------------- | -----: | -----: | -------- |
| Quick Wins (High Impact, Lower Effort)      | Trust Center + Questionnaire Automation 2.0  |      5 |      2 | P1       |
| Quick Wins (High Impact, Lower Effort)      | Governed AI Copilot MVP                      |      4 |      2 | P1       |
| Quick Wins (High Impact, Lower Effort)      | Integration Quality Score + Health Telemetry |      4 |      2 | P1       |
| Strategic Core (High Impact, Higher Effort) | CCM Hub (Control Health + Drift + Freshness) |      5 |      4 | P1       |
| Strategic Core (High Impact, Higher Effort) | Regulatory Change Intelligence Engine        |      5 |      4 | P1       |
| Strategic Core (High Impact, Higher Effort) | TPRM Intelligence Fusion                     |      5 |      4 | P2       |
| Strategic Core (High Impact, Higher Effort) | Executive Risk Quantification Layer          |      4 |      4 | P3       |
| Strategic Core (High Impact, Higher Effort) | Enterprise Federation + Delegated Governance |      4 |      5 | P3       |
| Fill-Ins (Medium Impact, Lower Effort)      | Board/Exec Reporting Templates               |      3 |      2 | P2       |
| Fill-Ins (Medium Impact, Lower Effort)      | Policy Exception Lifecycle v1                |      3 |      3 | P2       |

## Additional Improvements Backlog (Addendum)

| Quadrant                                    | Initiative                                       | Impact | Effort | Priority |
| ------------------------------------------- | ------------------------------------------------ | -----: | -----: | -------- |
| Quick Wins (High Impact, Lower Effort)      | Guided Program Onboarding and Maturity Assistant |      5 |      2 | P1       |
| Quick Wins (High Impact, Lower Effort)      | Reliability and Operability Console              |      4 |      2 | P1       |
| Strategic Core (High Impact, Higher Effort) | Evidence Lineage and Attestation Chain           |      5 |      3 | P1       |
| Strategic Core (High Impact, Higher Effort) | Assurance API and Control Assertions             |      4 |      3 | P2       |
| Strategic Core (High Impact, Higher Effort) | Partner/Marketplace Extension Framework          |      4 |      4 | P2       |
| Fill-Ins (Medium Impact, Lower Effort)      | Pricing and Value Instrumentation Layer          |      3 |      2 | P2       |
| Strategic Core (High Impact, Higher Effort) | Policy-as-Code and Control-as-Code Workspace     |      5 |      4 | P3       |
| Fill-Ins (Medium Impact, Lower Effort)      | Benchmarking and Peer Risk Intelligence          |      3 |      4 | P3       |

## Module-Level Mapping

### 1) Trust Center + Questionnaire Automation 2.0 (P1)

**Primary modules**

- `services/trust/src/trust-center/`
- `services/trust/src/questionnaires/`
- `services/trust/src/knowledge-base/`
- `frontend/src/pages/` (trust center and questionnaire UX)

**Core backlog slices**

- Dynamic trust content blocks bound to live control/evidence state.
- AI-assisted response generation with confidence + reviewer gate.
- SLA-driven questionnaire workflow and ownership routing.

**Dependencies**

- Shared evidence/control APIs from `services/controls/src/`.

### 2) Governed AI Copilot MVP (P1)

**Primary modules**

- `services/trust/src/ai/`
- `services/controls/src/ai/`
- `services/shared/src/security/`
- `services/shared/src/types/`

**Core backlog slices**

- Unified AI generation service contracts (draft/update/explain).
- Mandatory human approval state before publish/apply.
- Prompt/response provenance records for auditability.

**Dependencies**

- Existing AI provider configuration and MCP plumbing.

### 3) Integration Quality Score + Health Telemetry (P1)

**Primary modules**

- `services/controls/src/integrations/`
- `services/controls/src/collectors/`
- `services/shared/src/events/`
- `frontend/src/pages/Integrations*`

**Core backlog slices**

- Add integration reliability metrics (coverage, latency, failure rate).
- Surface health score in UI and dashboards.
- Add auto-retry and stale-evidence indicators.

### 4) CCM Hub (P1 Strategic)

**Primary modules**

- `services/controls/src/controls/`
- `services/controls/src/testing/`
- `services/controls/src/evidence/`
- `services/frameworks/src/` (framework rollups)
- `frontend/src/pages/` (new CCM dashboard views)

**Core backlog slices**

- Control health model (design + operating effectiveness + freshness).
- Drift detection events and remediation SLA workflows.
- Portfolio-level CCM dashboard and exception views.

### 5) Regulatory Change Intelligence Engine (P1 Strategic)

**Primary modules**

- `services/frameworks/src/frameworks/`
- `services/policies/src/policies/`
- `services/audit/src/` (test/procedure linkage)
- `services/shared/src/types/` (impact graph contracts)

**Core backlog slices**

- Regulatory delta ingestion and normalized taxonomy.
- Impact graph and “affected artifacts” query service.
- Guided update workflow and ownership notifications.

### 6) TPRM Intelligence Fusion (P2)

**Primary modules**

- `services/tprm/src/vendors/`
- `services/tprm/src/assessments/`
- `services/tprm/src/security-scanner/`
- `frontend/src/pages/Vendors*`

**Core backlog slices**

- External risk/rating ingestion adapters.
- Event-driven reassessment triggers on material score changes.
- Residual risk scoring combining internal + external signals.

### 7) Executive Risk Quantification Layer (P3)

**Primary modules**

- `services/frameworks/src/` (risk domain data)
- `services/tprm/src/` (vendor risk inputs)
- `services/audit/src/findings/`
- `frontend/src/components/dashboards/`

**Core backlog slices**

- Loss scenario models and confidence ranges.
- Remediation ROI prioritization scoring.
- Board pack exports and executive narrative templates.

### 8) Enterprise Federation + Delegated Governance (P3)

**Primary modules**

- `services/shared/prisma/` (tenant/entity model updates)
- `services/shared/src/auth/` and `services/shared/src/guards/`
- `services/*/src/*` (org/entity scoping propagation)
- `frontend/src/contexts/` and admin/settings pages

**Core backlog slices**

- Multi-entity organizational model and rollups.
- Delegated approval chains and scoped admin rights.
- Policy exception lifecycle with compensating controls.

## Release Train Recommendation

### Train A (0-90 days)

- Trust Center 2.0.
- Governed AI Copilot MVP.
- Integration quality/health telemetry.

### Train B (90-180 days)

- CCM Hub MVP.
- Regulatory Change Intelligence MVP.
- Board templates + policy exception workflow v1.

### Train C (180-360 days)

- TPRM Intelligence Fusion.
- Executive Quantification Layer.
- Enterprise Federation.
- Policy-as-Code and Control-as-Code (post-federation readiness).
- Benchmarking intelligence (post-data-contract maturity).

## Definition of Done (Per Initiative)

- API contracts documented and versioned.
- End-to-end RBAC checks validated.
- Audit log coverage for create/update/approve actions.
- Dashboard instrumentation for adoption and latency.
- Module-level docs updated under `docs/`.

## KPI Targets by End of 2026

- 40% reduction in questionnaire cycle time.
- 30% reduction in manual compliance coordination effort.
- 25% reduction in time-to-remediate control drift.
- 20% faster audit readiness for multi-framework customers.
- 15% improvement in enterprise opportunity conversion where trust/security review is in path.

## Related Docs

- [Platform market landscape](./PLATFORM_MARKET_LANDSCAPE_2026.md)
- [Platform additions roadmap](./PLATFORM_ADDITIONS_ROADMAP_2026.md)
- [Additional improvements gap analysis](./PLATFORM_ADDITIONS_GAP_ANALYSIS_2026.md)
- [Architecture baseline](./ARCHITECTURE.md)
- [Module configuration baseline](./MODULE_CONFIGURATION.md)
