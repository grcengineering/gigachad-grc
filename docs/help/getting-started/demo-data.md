# Demo data

The controls service can seed persistent sample records into a development organization.

## Availability

- Available only when the backend runs in `development` or `test`.
- Admin-only.
- Not loaded automatically.
- No active in-app load/reset button exists on this revision.
- Disabled in production.

Demo seed data is different from AI mock mode and frontend stubs.

## Start the local stack

```bash
./start.sh
```

Use `https://localhost` and Dev Login. The local Compose stack enables development authentication; production deployments do not.

## Check status

```bash
curl -k https://localhost/api/seed/status
```

The response reports whether demo data is loaded, whether the organization already contains data, and a current summary.

## Load

```bash
curl -k -X POST https://localhost/api/seed/load-demo
```

The implementation creates related sample data across several modules. Exact record counts can change and are not part of the API contract.

Loading fails when:

- the caller is not an admin;
- demo mutations are disabled in production;
- demo data is already loaded; or
- existing organization data conflicts with a safe seed operation.

## Reset

Reset organization data only when it is disposable:

```bash
curl -k -X POST https://localhost/api/seed/reset \
  -H 'Content-Type: application/json' \
  -d '{"confirmationPhrase":"DELETE ALL DATA"}'
```

The confirmation phrase is exact.

To remove the entire local Compose environment, including volumes and generated `.env`:

```bash
./start.sh reset
```

## Authentication

The local development guard supplies the default development admin. The `x-dev-user-id` override is a test fixture mechanism, not a documented client authentication scheme.

Production API calls require the configured JWT or API-key authentication path. Seed mutations remain unavailable regardless of credentials when `NODE_ENV=production`.

## Troubleshooting

### The app has no Demo Data settings section

That is expected on this revision. Use the API commands above.

### The request returns forbidden

Confirm the controls service runs with `NODE_ENV=development` and that local Dev Login is active.

### Data is already present

Use the status endpoint. Do not reset an organization until its data has been backed up or declared disposable.

### Records do not appear

Check:

```bash
docker compose ps
docker compose logs controls
curl http://localhost:3001/health
```

Refresh the application at `https://localhost`, not the direct frontend port.

## Related guides

- [Getting started](../../../GETTING_STARTED.md)
- [Demo and sandbox](../../DEMO.md)
- [First steps](first-steps.md)
