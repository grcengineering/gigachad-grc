# Trust Center custom domain

## Current status

The Trust configuration model can store a `customDomain` value, but this repository does not implement automatic DNS verification, ingress updates, or per-domain certificate provisioning.

Setting a custom domain in the application is therefore not sufficient to make that hostname work.

## Operator-managed setup

To expose a Trust Center on a custom hostname, the deployment operator must provide:

- DNS;
- an ingress/router rule;
- a valid TLS certificate and renewal process;
- routing to the public Trust Center path;
- appropriate caching and security headers; and
- deployment-specific verification and monitoring.

These changes live outside the current application configuration and differ between Docker, Kubernetes, and other ingress platforms.

## Security requirements

- Do not expose administrative Trust APIs as public routes.
- Verify anonymous/public content filtering.
- Restrict CORS to intended origins.
- Test tenant and unpublished-content isolation.
- Monitor certificate expiry and DNS changes.
- Remove the route and DNS record when the custom domain is disabled.

## Availability

Automatic Let's Encrypt provisioning for arbitrary Trust Center domains is unavailable on this revision. The production Traefik configuration only provisions certificates for host rules explicitly present in the deployment.

Contact the deployment operator before entering a custom domain value.
