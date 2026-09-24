# Integrations setup guide

External integrations are configuration-required. The platform does not synthesize provider evidence when credentials are missing.

## Before you begin

For each provider, obtain:

- a dedicated least-privilege service identity;
- the token, service-account key, or client credentials requested by the integration form;
- tenant, organization, project, subscription, region, or base URL values;
- enabled upstream APIs; and
- network egress from the controls service.

Protect `ENCRYPTION_KEY`; it is required to store and later decrypt integration credentials.

## Configure and verify

1. Open **Integrations**.
2. Select the provider.
3. Complete all required fields.
4. Save.
5. Run **Test Connection**.
6. Verify that the response identifies the intended upstream account.
7. Run **Sync Now**.
8. Review errors and compare collected counts with the provider.
9. Inspect the generated evidence JSON.

Do not rely on catalog presence, field validation, or a zero-item response as proof that collection works.

## Provider scopes

Use provider documentation to select read-only scopes for only the evidence being collected. Common prerequisites include:

- cloud security/read APIs for AWS, Azure, or GCP;
- organization and repository read scopes for source control;
- directory/audit-log scopes for identity providers;
- read-only device inventory for MDM; and
- issue/project read access for ticketing.

The exact scopes vary by connector and provider API version. Validate them in a non-production tenant.

## AWS status

The generic AWS integration path is unavailable on base `6275e43e`: the registered connector intentionally throws rather than returning former mock data. A separate SDK collector exists but is not wired into `/api/integrations/:id/sync`.

## Manual versus scheduled sync

Manual sync is implemented. The integration `syncFrequency` field is stored, but this guide does not claim a provider-sync scheduler for every cataloged connector.

Control evidence collectors have their own daily/weekly/monthly scheduler and are documented separately.

## AI, email, and scanners

These are separate capabilities:

- AI requires OpenAI/Anthropic configuration or explicit non-production `AI_MOCK_MODE=true`.
- Email requires a configured delivery provider; console behavior is not delivery.
- Vendor security scanning makes network requests and depends on target reachability.
- Local Trivy/Nmap installation is not a generic integration fallback.

## Troubleshooting

### Pending implementation

Treat the connector as unavailable through the current path.

### Authentication failed

Verify credential expiry, tenant/base URL, scopes, enabled APIs, system clock, CA trust, and egress.

### Partial results

Inspect the connector's returned `errors` field and controls logs. Many connectors continue after one upstream endpoint fails.

### Evidence storage failed

Check RustFS/S3 and the controls logs:

```bash
docker compose ps rustfs controls
docker compose logs controls
```

## References

- [Connecting integrations](../help/integrations/connecting-integrations.md)
- [Integration implementation status](../INTEGRATION_IMPLEMENTATION_STATUS.md)
- [Evidence collectors](../help/data/evidence-collectors.md)
- [Secrets management](../secrets-management.md)
