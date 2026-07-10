#!/usr/bin/env bash
# Launch the full GigaChad GRC stack for local development + seed demo data.
# Prereqs: Docker Desktop running.
#
# Usage:
#   ./scripts/launch-dev.sh           # bring up stack + seed
#   ./scripts/launch-dev.sh down      # stop everything
#   ./scripts/launch-dev.sh logs      # tail service logs

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker daemon is not running. Start Docker Desktop first."
  exit 1
fi

cmd="${1:-up}"

case "$cmd" in
  down)
    docker compose down
    exit 0
    ;;
  logs)
    docker compose logs -f
    exit 0
    ;;
  up|"")
    ;;
  *)
    echo "Unknown command: $cmd"
    echo "Usage: $0 [up|down|logs]"
    exit 1
    ;;
esac

if [ ! -f .env ]; then
  echo "❌ No .env file. Copy .env.example to .env and edit it first."
  exit 1
fi

echo "▶ Bringing up the stack…"
docker compose up -d

echo "▶ Waiting for backend services to be healthy…"
ready=0
for i in {1..60}; do
  controls=$(curl -sS -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo 000)
  frameworks=$(curl -sS -o /dev/null -w "%{http_code}" http://localhost:3002/health 2>/dev/null || echo 000)
  if [ "$controls" = "200" ] && [ "$frameworks" = "200" ]; then
    ready=1
    echo "  ✓ controls + frameworks healthy"
    break
  fi
  printf '.'
  sleep 2
done
echo

if [ "$ready" != "1" ]; then
  echo "⚠️  Backend services did not become healthy within 2 minutes."
  echo "    Run: docker compose ps  and  docker compose logs"
  exit 1
fi

echo "▶ Seeding frameworks (SOC 2 + ISO 27001 + controls)…"
seed_response=$(curl -sS -w "\n%{http_code}" -X POST http://localhost:3002/api/frameworks/seed -H 'x-user-id: system' -H 'x-organization-id: default-org' -H 'Content-Type: application/json' -d '{}' 2>&1 || true)
echo "$seed_response" | head -20

echo "▶ Seeding default permission groups…"
curl -sS -X POST http://localhost:3001/api/permissions/seed -H 'x-user-id: system' -H 'x-organization-id: default-org' -H 'Content-Type: application/json' -d '{}' > /dev/null || true

echo
echo "✓ Stack is up."
echo
echo "Next:"
echo "  • Backend services: http://localhost:3001–3007"
echo "  • Keycloak admin:   http://localhost:8080 (admin / see .env)"
echo "  • MinIO console:    http://localhost:9001"
echo "  • Frontend dev:     cd frontend && npm run dev"
echo "    then visit:       http://localhost:3000"
echo
