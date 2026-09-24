#!/usr/bin/env bash
#
# Compatibility wrapper for the canonical Docker startup flow.
#
# The former implementation launched infrastructure containers, API containers,
# and a host Vite process independently. That diverged from the supported
# gateway URLs, credential generation, certificate setup, and database startup
# behavior in start.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cat <<'NOTICE'
scripts/start-demo.sh is a compatibility alias for ./start.sh.

It starts the canonical Docker Compose stack. Demo records are not loaded
automatically. After startup, use:

  curl -k -X POST https://localhost/api/seed/load-demo

AI mock output is separate and requires AI_MOCK_MODE=true in non-production.
External connectors require real provider credentials.
NOTICE

exec "$PROJECT_ROOT/start.sh" "$@"
