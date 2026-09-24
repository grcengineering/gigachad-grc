# Connecting integrations

The Integrations page stores provider configuration, tests connector authentication, runs manual syncs, and writes sync output to evidence storage.

## Availability warning

A provider card means the provider is cataloged. It does not prove that the connector is complete or verified for your provider plan/API version.

Before relying on a connector, check [Integration implementation status](../../INTEGRATION_IMPLEMENTATION_STATUS.md) and run an environment-specific acceptance test.

## Prerequisites

Most providers require:

- a dedicated service identity;
- API token, service-account key, or OAuth client credentials;
- least-privilege scopes;
- enabled upstream APIs;
- outbound HTTPS from the controls service; and
- an `ENCRYPTION_KEY` for protected credential storage.

Some providers also require an organization, tenant, region, subscription, project, or base URL.

The platform does not provide a universal browser OAuth flow for every card. Use the authentication fields presented by the selected connector and the provider's API documentation.

## Connect a provider

1. Open **Integrations**.
2. Select the provider.
3. Enter the required configuration.
4. Save the integration.
5. Run **Test Connection**.
6. Confirm the result identifies the expected upstream account or tenant.
7. Run **Sync Now**.
8. Inspect sync errors, collected data, and the generated evidence artifact.

Do not treat field validation alone as a successful connection. Some catalog/factory mismatches can return a pending-implementation message without calling the provider.

## Sync behavior

The generic integration sync path:

1. decrypts the stored configuration;
2. calls the selected connector;
3. records a sync job;
4. stores the connector result as a JSON evidence artifact; and
5. updates last-sync metadata.

Connector results can be partial. Review any returned `errors` collection and controls-service logs.

The `syncFrequency` value is stored, but this guide does not claim that every connector has an active automatic sync scheduler. Use **Sync Now** unless your deployment has verified scheduling separately.

## No connector demo mode

Missing credentials do not enable sample evidence. A connector should fail or report unavailable when it cannot call the upstream provider.

Empty arrays or zero counts are not proof of a healthy connection. Compare results with the provider.

## Known AWS limitation

On this base revision, the AWS connector registered by the generic integration factory is intentionally unavailable and throws instead of returning former mock data. A separate SDK-based collector exists in code but is not wired into the generic Integrations sync endpoint.

Do not use the AWS catalog card as production evidence collection on this revision.

## Credential storage

Sensitive fields are encrypted using `ENCRYPTION_KEY`. The default secrets provider stores encrypted values locally. Infisical can be enabled separately.

Operational requirements:

- protect and back up the encryption key;
- rotate provider credentials;
- never paste secrets into logs or issue reports;
- test decryption after an upgrade; and
- use a different key per environment.

Losing `ENCRYPTION_KEY` can make stored credentials unrecoverable.

## Custom integrations

Visual custom integrations can call configured HTTP endpoints and map responses to evidence. SSRF and response-size protections apply.

Custom JavaScript execution is disabled by default:

```env
ENABLE_CUSTOM_CODE_EXECUTION=false
```

Enabling arbitrary code execution changes the threat model and is not recommended for production.

## Troubleshooting

### Test Connection reports pending implementation

The catalog type does not have a usable connector through the current path. Treat it as unavailable.

### Test passes but sync is empty

Verify provider scopes and enabled APIs, inspect returned errors, and compare counts with the provider. Authentication success is not collection coverage.

### Authentication fails

Check token expiration, tenant/base URL, network egress, proxy/CA settings, clock synchronization, and provider API permissions.

### Sync fails to store evidence

Check RustFS/S3 health and controls logs:

```bash
docker compose ps rustfs controls
docker compose logs controls
```
