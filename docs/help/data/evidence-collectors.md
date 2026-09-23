# Evidence collectors

Evidence collectors are HTTP collection jobs attached to a specific control implementation.

They are separate from provider-specific connectors on the Integrations page.

## What is implemented

A collector can:

- call an operator-configured HTTP endpoint;
- use API-key, bearer, basic, or client-credentials OAuth authentication;
- map the response into a JSON evidence artifact;
- link the artifact to its control implementation;
- run manually; and
- run on the built-in daily, weekly, or monthly schedule.

Collector endpoints are nested under:

```text
/api/controls/:controlId/implementations/:implementationId/collectors
```

## Prerequisites

Before creating a collector:

1. create the control implementation;
2. identify an upstream API that returns suitable evidence;
3. create a least-privilege provider identity;
4. permit outbound access from controls; and
5. decide which response fields are appropriate to retain.

The service applies SSRF protection, request timeouts, retries, and a response-size limit. Internal/private targets may be blocked by design.

## Configure

From the control implementation, create a collector with:

- name and description;
- base URL and endpoint;
- HTTP method;
- headers and query parameters;
- authentication type and values;
- response mapping;
- evidence title/type; and
- optional schedule.

Use **Test Connection** before enabling a schedule. A successful test means the HTTP request returned a successful status; it does not validate the compliance meaning of the response.

## Run

A successful run:

1. calls the endpoint;
2. stores the JSON response in object storage;
3. creates an approved automated evidence record;
4. links it to the control implementation; and
5. records run history.

Review whether automatic approval is appropriate for your assurance process.

## Scheduling

The scheduler polls every five minutes for due collectors. Built-in next-run calculation supports:

- daily;
- weekly; and
- monthly.

Although a `scheduleCron` field exists, the current next-run implementation uses the frequency value. Do not claim arbitrary cron execution without additional implementation and tests.

## Authentication limitations

Client-credentials OAuth is implemented. A generalized interactive authorization-code flow is not provided by the collector service.

When reusing an integration configuration, confirm that the collector receives the expected base URL and authentication fields. Integration credentials and collector `authConfig` have different storage/masking paths and should be reviewed for your threat model.

## No demo fallback

Collectors do not generate sample evidence when credentials, SDKs, or tools are missing. A failed upstream call produces a failed run.

To evaluate the workflow without a production provider, use a controlled test endpoint containing non-sensitive synthetic data and label the resulting evidence accordingly.

## Security

- Use read-only provider identities where possible.
- Avoid collecting secrets, tokens, personal data, or entire verbose API responses unnecessarily.
- Keep response mappings narrow.
- Rotate credentials.
- Review object-storage retention.
- Monitor collector failures.
- Do not expose internal metadata endpoints as collector targets.

## Troubleshooting

### Base URL is required

Set it directly on the collector or verify the selected integration supplies the expected server URL.

### SSRF protection blocked the request

The target resolved to a disallowed location or failed URL validation. Do not bypass the protection casually; use an approved externally reachable collection endpoint.

### OAuth token request fails

Verify token URL, client ID, client secret, scope, CA trust, and provider grant configuration.

### Response too large

Narrow the upstream query or response. The default maximum is 10 MB unless `COLLECTOR_MAX_RESPONSE_SIZE_BYTES` is explicitly changed.

### Scheduled runs do not occur

Confirm the collector is active, scheduling is enabled, a supported frequency is set, and `nextRunAt` is due. Check controls logs for scheduler errors.

## Related topics

- [Evidence](../compliance/evidence.md)
- [Evidence retention](evidence-retention.md)
- [Connecting integrations](../integrations/connecting-integrations.md)
