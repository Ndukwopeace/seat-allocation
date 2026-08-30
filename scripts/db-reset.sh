#!/usr/bin/env bash
# DESTRUCTIVE: drops and recreates the database configured by DATABASE_URL,
# reapplies all Prisma migrations, and reseeds it. Useful when local
# migration state gets tangled or you just want a clean slate.
#
# Usage: scripts/db-reset.sh [--yes]
#   --yes   skip the confirmation prompt (for CI/non-interactive use)

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

[ -f .env ] || die ".env not found. Run scripts/env-setup.sh first."
load_env_file
[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set."

CONFIRMED=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) CONFIRMED=1 ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

if [ "$CONFIRMED" -ne 1 ]; then
  warn "This will DROP ALL DATA in the database at:"
  warn "  $DATABASE_URL"
  read -r -p "Type 'reset' to continue: " reply
  [ "$reply" = "reset" ] || die "Aborted."
fi

log "Ensuring PostgreSQL is running..."
ensure_local_postgres_running

log "Resetting database (drop + reapply migrations)..."
# Note: unlike older Prisma versions, `migrate reset` does not auto-run the
# configured seed command here (and this Prisma release has no --skip-seed
# flag either) — so we seed explicitly as a separate step below.
npx prisma migrate reset --force

log "Seeding the database..."
npm run db:seed

ok "Database reset complete."
