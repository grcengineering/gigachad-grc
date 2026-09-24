# FieldGuide integration

## Current availability

FieldGuide support is API-only on this revision. The backend contains connection, sync, mapping, history, and webhook routes, but the frontend does not expose a FieldGuide settings page or OAuth redirect flow.

## Prerequisites

- Active FieldGuide account and API access
- FieldGuide API key
- Optional custom instance/API URL
- FieldGuide organization identifier where required
- Outbound HTTPS from the audit service
- Admin, compliance-manager, or auditor role

## Authentication model

`POST /api/fieldguide/connect` accepts an API key configuration and tests it against the FieldGuide API. It is not an interactive browser OAuth flow.

Use the audit service Swagger document for the current request schema:

```text
http://localhost:3007/api/docs
```

## Implemented routes

```text
POST   /api/fieldguide/connect
POST   /api/fieldguide/disconnect
GET    /api/fieldguide/status
POST   /api/fieldguide/sync
GET    /api/fieldguide/sync/history
GET    /api/fieldguide/mappings
POST   /api/fieldguide/mappings
DELETE /api/fieldguide/mappings/:auditId
POST   /api/fieldguide/webhook
```

## Operational requirements

Before production use:

1. verify the FieldGuide API contract and API-key scopes;
2. test pull and push directions separately;
3. compare synchronized audits, requests, evidence, and findings;
4. configure and verify webhook signing;
5. monitor sync history and audit-service logs; and
6. document conflict and deletion behavior.

Do not claim real-time or complete bidirectional sync until those tests pass for the provider version in use.

## Troubleshooting

### No FieldGuide menu exists

That is expected on this revision. Use the API/Swagger routes.

### Connection fails

Verify API key, API URL, organization identifier, egress, proxy, and CA trust.

### Sync is partial

Review the sync result and audit-service logs. Unlinked remote audits are not automatically created as local audits.
