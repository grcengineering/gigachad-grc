#!/bin/bash
################################################################################
# GigaChad GRC - Local HTTPS dev certificate generator
################################################################################
#
# Generates a self-signed TLS certificate for Traefik covering every
# *.localhost host this stack routes (see gateway/traefik.yml and the
# `traefik.http.routers.*.rule=Host(...)` labels in docker-compose.yml).
#
# Browsers/OSes resolve *.localhost to 127.0.0.1 automatically (RFC 6761),
# so no /etc/hosts changes are needed - only a trusted (or accepted)
# certificate.
#
# Usage: ./scripts/generate-dev-certs.sh [--force]
#
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CERT_DIR="$PROJECT_DIR/gateway/certs"
CRT="$CERT_DIR/dev-localhost.crt"
KEY="$CERT_DIR/dev-localhost.key"

FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
  esac
done

if [[ -f "$CRT" && -f "$KEY" && "$FORCE" != "true" ]]; then
  echo "Certificate already exists at $CRT (use --force to regenerate)."
  exit 0
fi

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -days 825 \
  -keyout "$KEY" \
  -out "$CRT" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

chmod 600 "$KEY"

echo "Generated dev TLS certificate:"
echo "  $CRT"
echo "  $KEY"
echo ""
echo "This is self-signed, so browsers will show a warning on first visit to"
echo "https://localhost (and https://auth.localhost, etc.) - click through it"
echo "(e.g. \"Advanced > Proceed\"), or import $CRT into your OS/browser trust"
echo "store to silence the warning."
