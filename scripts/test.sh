#!/usr/bin/env bash
# Ensures PostgreSQL is up, then runs the allocation business-rule test
# suite (tests/*.test.ts). Tests truncate their own tables via resetDb() —
# don't point this at a database with data you care about.
#
# Usage: scripts/test.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

[ -f .env ] || die ".env not found. Run scripts/env-setup.sh first."
load_env_file

log "Ensuring PostgreSQL is running..."
ensure_local_postgres_running

log "Running tests..."
npm test
