# Remote and non-localhost deployment

The default `docker-compose.yml` stack is localhost-only.

It assumes:

- frontend host `localhost`;
- Keycloak host `auth.localhost`;
- a self-signed certificate for localhost names;
- direct service ports bound to `127.0.0.1`; and
- development authentication.

Changing `CORS_ORIGINS` or exposing port 3000 does not turn that stack into a correct remote deployment. The frontend direct port has no gateway API routing, and the Traefik router rules still match localhost.

## Production remote access

Use a reviewed production deployment with:

- public or private DNS;
- valid TLS;
- `APP_DOMAIN`;
- `KEYCLOAK_HOSTNAME`;
- Keycloak redirect URIs and web origins;
- development authentication disabled;
- only Traefik exposed to clients; and
- private backend, database, cache, and storage networks.

Start with:

- [Deployment guide](DEPLOYMENT.md)
- [Production deployment](PRODUCTION_DEPLOYMENT.md)

The production Compose file is a configuration-required reference and needs the operator override documented there.

## Required routing model

Clients should use one application origin:

```text
https://grc.example.com
```

Traefik routes same-origin `/api/...` requests to the six API services. Keycloak uses a separate configured host, for example:

```text
https://auth.grc.example.com
```

Do not expose ports 3000-3007 or 8080 directly to users.

## Keycloak requirements

Configure the `grc-frontend` client with exact production values:

```text
Valid redirect URI: https://grc.example.com/*
Web origin:         https://grc.example.com
```

Use generated `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD` values from the protected production environment or secrets manager.

## LAN-only evaluation

A LAN deployment using the development Compose file requires custom Traefik host rules, a certificate trusted for the LAN hostname, frontend build settings, Keycloak configuration, and firewall review. No tested override for that topology ships on this revision.

Do not bind every direct service port to `0.0.0.0`. If you create a LAN-specific deployment, expose only the gateway and document that it remains a non-production environment.

## Verification

From a client outside the host:

```bash
curl -fsS https://grc.example.com/api/system/health
curl -fsS https://auth.grc.example.com/auth/realms/gigachad-grc/.well-known/openid-configuration
```

Then verify login, API authorization, tenant isolation, evidence upload/download, and logout.

## Common failure causes

- DNS does not match Traefik host rules.
- The certificate does not cover the application or auth hostname.
- Keycloak redirect URIs still point to localhost.
- The frontend was built with a direct localhost API URL.
- Dev Login was accidentally enabled.
- Backend service ports were exposed instead of routed privately.
