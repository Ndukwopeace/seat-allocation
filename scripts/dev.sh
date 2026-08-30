#!/usr/bin/env bash
# Convenience dev launcher: makes sure .env exists and PostgreSQL is up,
# then starts `next dev`. Run scripts/env-setup.sh once first on a fresh
# checkout (it also installs deps, migrates and seeds).
#
# Usage: scripts/dev.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

[ -f .env ] || die ".env not found. Run scripts/env-setup.sh first."
load_env_file

log "Ensuring PostgreSQL is running..."
ensure_local_postgres_running

log "Starting Next.js dev server..."
exec npm run dev
