# Cloud deployment

GigaChad GRC is a multi-service container application. A cloud deployment must run the frontend, six API services, PostgreSQL, Redis, Keycloak-compatible authentication, S3-compatible object storage, and ingress/routing.

## Available repository artifacts

| Option | Status |
| --- | --- |
| Docker Compose on a VM | Configuration-required; use `docker-compose.prod.yml` as a reviewed reference |
| Kubernetes | Helm chart present under `helm/`; cluster-specific configuration and testing required |
| Managed PostgreSQL/Redis/S3 | Possible only with operator-maintained Compose/Helm overrides |
| Supabase + Vercel | Unsupported on this revision |

## Why Supabase + Vercel is not a deployment option

The repository does not contain:

- Vercel build/routing configuration for all backend services;
- serverless API functions replacing the NestJS services;
- a Supabase storage provider;
- Supabase RLS policies matching application tenant authorization;
- a replacement for Redis-backed functions;
- a replacement authentication flow; or
- deployment tests for that architecture.

Deploying only the React frontend to Vercel will not provide a working platform.

The file at `docs/deployment/supabase-vercel-migration.md` is retained only as an unsupported architecture note, not an installation guide.

## Cloud VM path

For a single-host evaluation:

1. provision a Linux VM with Docker Engine and Compose v2;
2. configure DNS for the application, auth, and storage hosts;
3. copy `env.example.production` to a protected `.env.prod`;
4. generate every secret;
5. add required operator overrides;
6. render and validate Compose;
7. configure off-host backups and monitoring; and
8. follow [Production deployment](../../PRODUCTION_DEPLOYMENT.md).

The production Compose file is not a high-availability design.

## Kubernetes path

The `helm/` chart requires:

- application images in your registry;
- Kubernetes Secrets or an external secrets operator;
- an ingress controller and certificate management;
- persistent volumes or managed PostgreSQL/Redis/S3 services;
- network policy;
- backup/restore integration; and
- chart render, install, and upgrade tests.

```bash
helm lint ./helm
helm template gigachad-grc ./helm -f my-values.yaml > rendered.yaml
```

Review the rendered workload and secret references before installation.

## Managed external services

Replacing bundled infrastructure is not controlled by a single flag. Update and test:

- database and Redis connection URLs;
- TLS and CA trust;
- service health dependencies;
- S3 endpoint, region, path style, bucket, and credentials;
- Keycloak issuer, realm, clients, redirect URIs, and proxy path;
- backup tooling; and
- private network access.

## Provider prerequisites

Cloud hosting does not enable external application features. AI, email, third-party integrations, remote backup, error tracking, and MCP servers each require separate configuration and credentials.

## Unsupported hosted-development claims

There is no `.gitpod.yml` or repository dev-container configuration. Gitpod and GitHub Codespaces are not documented startup methods on this revision.
