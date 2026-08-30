#!/usr/bin/env bash
# Production build pipeline: clean install -> prisma generate -> typecheck
# -> lint -> next build. Does not require a reachable database (prisma
# generate only reads schema.prisma; it doesn't connect).
#
# Usage: scripts/build.sh [--skip-lint] [--skip-typecheck]

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$PROJECT_ROOT"

SKIP_LINT=0
SKIP_TYPECHECK=0
for arg in "$@"; do
  case "$arg" in
    --skip-lint) SKIP_LINT=1 ;;
    --skip-typecheck) SKIP_TYPECHECK=1 ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

require_cmd node "Install Node.js 20+."
require_cmd npm "Install Node.js 20+ (npm ships with it)."

log "Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

log "Generating Prisma client..."
npx prisma generate

# tsc needs the route-typing helpers (PageProps, LayoutProps, etc.) that
# Next.js writes to .next/types — normally produced by `next dev`/`next
# build`, neither of which has run yet on a fresh checkout. `next typegen`
# generates just those without a full build.
log "Generating Next.js route types..."
npx next typegen

if [ "$SKIP_TYPECHECK" -eq 0 ]; then
  log "Type-checking..."
  npx tsc --noEmit -p tsconfig.json
else
  warn "Skipping typecheck (--skip-typecheck)."
fi

if [ "$SKIP_LINT" -eq 0 ]; then
  log "Linting..."
  npx eslint .
else
  warn "Skipping lint (--skip-lint)."
fi

log "Building Next.js app..."
npm run build

ok "Build complete."
