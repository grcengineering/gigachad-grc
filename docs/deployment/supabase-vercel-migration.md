# Supabase and Vercel architecture note

> Unsupported on this revision. This is not a deployment guide.

The executable repository is a containerized multi-service application. It does not include the adapters or configuration required to deploy GigaChad GRC on Supabase and Vercel.

## Missing implementation

A supported migration would require, at minimum:

- a serverless replacement or hosting plan for all NestJS APIs;
- Vercel routing and build configuration;
- a Supabase-compatible object-storage implementation;
- tenant-isolation and RLS policies proven equivalent to service authorization;
- an authentication replacement for Keycloak and its role claims;
- replacements for Redis queues, cache, sessions, and events;
- a versioned database migration plan;
- background job and scheduled collector hosting;
- secrets, backup, monitoring, and restore designs; and
- integration and security tests for the new architecture.

None of those items should be inferred from PostgreSQL compatibility alone.

## Current deployment choices

Use:

- `docker-compose.yml` and `./start.sh` for local evaluation;
- `docker-compose.prod.yml` only as a reviewed production reference; or
- the `helm/` chart after cluster-specific validation.

See [Deployment guide](../DEPLOYMENT.md).

## Status

Supabase/Vercel is an unimplemented architecture proposal. It is not recommended, supported, cost-estimated, or covered by repository deployment tests.
