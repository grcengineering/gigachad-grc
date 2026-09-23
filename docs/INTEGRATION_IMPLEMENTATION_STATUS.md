# Integration implementation status

Status reconciled against base `6275e43e`.

## Read this first

The Integrations page exposes a large catalog, but catalog visibility is not the same as production support.

There are three separate layers:

1. `IntegrationType` and `INTEGRATION_TYPES` define API-accepted/cataloged types.
2. `ConnectorFactory` registers connector implementations.
3. Each connector implements its own authentication test and sync coverage.

Those layers are not currently generated from one source and do not have complete parity. Do not quote the catalog size as the number of fully supported connectors.

## Platform integration functions

| Function | Status | Notes |
| --- | --- | --- |
| List integration types | Implemented | `GET /api/integrations/types` |
| Create/update/delete configuration | Implemented | Admin or compliance-manager role |
| Encrypt sensitive config fields | Implemented | Requires `ENCRYPTION_KEY`; external secrets provider is optional |
| Test connection | Implemented at platform level | Result quality depends on the selected connector |
| Manual sync | Implemented at platform level | Calls the connector and stores a generic JSON evidence artifact |
| Sync job history/status | Implemented in persistence | Manual sync creates a job record |
| Automatic integration sync by `syncFrequency` | Not established | The field is stored, but this document does not claim a provider-sync scheduler is wired |
| Generic browser OAuth flow for all catalog cards | Not implemented as a universal flow | Most connectors require tokens, service accounts, or client credentials supplied in configuration |
| Custom integration visual mode | Implemented | Calls configured HTTP endpoints with SSRF protections |
| Custom JavaScript execution | Disabled by default | Requires `ENABLE_CUSTOM_CODE_EXECUTION=true`; not recommended for production |

## Connector behavior

For a connector to be considered usable in an environment, all of these must be true:

- the type is accepted by the API;
- the factory returns a connector;
- **Test Connection** makes a successful upstream request;
- required provider APIs and scopes are enabled;
- outbound network access is allowed;
- a manual sync returns the expected provider data; and
- the resulting evidence artifact is reviewed for completeness.

A successful platform sync only proves that the connector call completed and an evidence record could be stored. It does not prove that every advertised evidence type was collected.

Many connectors catch individual upstream endpoint failures and return partial results with an `errors` collection. Operators must review that collection and the controls-service logs.

## Known exceptions and gaps

### AWS generic integration

The generic integration factory currently registers `AWSConnector`, but that class deliberately throws because its former mock transport was removed. A separate SDK-based `AWSCollector` exists under `services/controls/src/integrations/collectors/`, but it is not wired into the generic `/api/integrations/:id/sync` path.

Result: do not claim AWS sync from the Integrations page is available on this base.

### Catalog/factory mismatch

The factory contains registrations that are not necessarily accepted by the DTO enum, while some cataloged types can reach the factory's "pending implementation" fallback.

Notably, an unknown factory type can return a configuration-validation message from **Test Connection** without proving upstream connectivity. Only an actual provider response establishes a working connection.

### Mock behavior

Connectors do not have a supported "missing credentials means sample evidence" mode. Missing or invalid provider configuration should be treated as unavailable or failed.

Do not interpret empty collections, zero counts, or generic evidence files as demo data or successful compliance evidence.

## Evidence collectors are a separate feature

Control evidence collectors live under:

```text
/api/controls/:controlId/implementations/:implementationId/collectors
```

They can call an operator-configured HTTP endpoint on a schedule and create evidence linked to a control. They do not turn every catalog card into a provider-specific collector, and they do not synthesize sample evidence when configuration is absent.

## Minimum acceptance test per provider

Before enabling a connector in production:

1. create a least-privilege provider identity;
2. configure the integration in a non-production organization;
3. run **Test Connection** and verify the upstream account/tenant identity;
4. run a manual sync;
5. inspect `data.errors` and service logs;
6. compare collected counts with the provider;
7. open the generated evidence JSON and verify required fields;
8. test expired/revoked credentials;
9. test tenant isolation; and
10. document provider API versions and required scopes.

## Documentation policy

Use these terms consistently:

- **Cataloged**: appears in metadata/UI.
- **Registered**: has a factory entry.
- **Implemented**: contains code that calls an upstream API.
- **Verified**: passed the acceptance test above for a specific version and environment.
- **Unavailable**: known not to work through the documented path.

Only **verified** connectors should be described as production-supported by an operator. This repository does not currently publish a verified-provider certification matrix.
