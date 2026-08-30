#!/usr/bin/env bash
# One-shot, idempotent local environment setup:
#   1. checks Node/npm
#   2. creates .env from .env.example (with a generated SESSION_SECRET) if missing
#   3. starts PostgreSQL (local service, or Docker as a fallback) if not already up
#   4. creates the app DB role + database if they don't exist
#   5. installs npm dependencies
#   6. applies Prisma migrations
#   7. seeds the database (safe to re-run — prisma/seed.ts uses upsert)
#
# Usage: scripts/env-setup.sh [--no-seed]

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

SEED=1
for arg in "$@"; do
  case "$arg" in
    --no-seed) SEED=0 ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

log "Checking prerequisites..."
require_cmd node "Install Node.js 20+."
require_cmd npm "Install Node.js 20+ (npm ships with it)."
ok "node $(node -v), npm $(npm -v)"

if [ ! -f .env ]; then
  log "No .env found — creating one from .env.example..."
  cp .env.example .env
  SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  # Portable in-place sed for both GNU and BSD sed.
  sed -i.bak "s#^SESSION_SECRET=.*#SESSION_SECRET=\"$SECRET\"#" .env && rm -f .env.bak
  ok "Created .env with a generated SESSION_SECRET."
else
  ok ".env already exists — leaving it untouched."
fi

load_env_file

log "Ensuring PostgreSQL is running..."
ensure_local_postgres_running

log "Ensuring database role and database exist..."
# Only manage role/database ourselves for a local (non-Docker) Postgres —
# the Docker fallback already provisions both via container env vars.
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$DOCKER_PG_CONTAINER"; then
  ensure_role_and_database
fi

log "Installing npm dependencies..."
npm install

log "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "$SEED" -eq 1 ]; then
  log "Seeding the database..."
  npm run db:seed
else
  log "Skipping seed (--no-seed)."
fi

ok "Environment ready. Run 'npm run dev' to start the app."
