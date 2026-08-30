#!/usr/bin/env bash
# Production start: apply any pending Prisma migrations against DATABASE_URL,
# then run the already-built Next.js app (run scripts/build.sh first).
#
# Usage: scripts/start.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

load_env_file
[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set. Create .env (see .env.example) or export it before running this script."

if [ ! -d .next ]; then
  die "No .next build found. Run scripts/build.sh first."
fi

log "Applying pending Prisma migrations..."
npx prisma migrate deploy

log "Starting Next.js..."
exec npm run start
