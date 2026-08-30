#!/usr/bin/env bash
# Shared helpers for the scripts/*.sh tooling. Not meant to be run directly —
# every other script does: source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# Resolve the project root regardless of where the caller cd'd from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- logging -----------------------------------------------------------

if [ -t 1 ]; then
  C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_RESET=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_WARN=""; C_ERR=""; C_RESET=""
fi

log()  { printf '%s[info]%s %s\n'  "$C_INFO" "$C_RESET" "$*"; }
ok()   { printf '%s[ ok ]%s %s\n'  "$C_OK"   "$C_RESET" "$*"; }
warn() { printf '%s[warn]%s %s\n'  "$C_WARN" "$C_RESET" "$*" >&2; }
err()  { printf '%s[fail]%s %s\n'  "$C_ERR"  "$C_RESET" "$*" >&2; }

die() { err "$*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed. $2"
}

# --- env file ------------------------------------------------------------

# Loads PROJECT_ROOT/.env into the current shell (KEY=value lines), if present.
load_env_file() {
  if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
  fi
}

# --- postgres --------------------------------------------------------------

# Defaults match prisma/seed.ts and the .env.example connection string —
# override any of these in the environment before calling env-setup.sh if
# your local setup differs.
: "${DB_USER:=siu_app}"
: "${DB_PASSWORD:=siu_app_dev}"
: "${DB_NAME:=siu_seat_allocation}"
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"

pg_is_reachable() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "select 1" >/dev/null 2>&1
}

# Starts a local (systemd/service-managed) PostgreSQL if one is installed but
# not running. No-ops if it's already up, or if there's nothing to manage
# locally (e.g. DATABASE_URL points at a remote/managed database).
ensure_local_postgres_running() {
  if command -v pg_isready >/dev/null 2>&1 && pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    ok "PostgreSQL is already running on $DB_HOST:$DB_PORT."
    return 0
  fi

  if command -v pg_lsclusters >/dev/null 2>&1; then
    log "Starting local PostgreSQL service (Debian/Ubuntu pg_ctlcluster)..."
    if command -v sudo >/dev/null 2>&1; then
      sudo service postgresql start
    else
      service postgresql start
    fi
    return 0
  fi

  if command -v brew >/dev/null 2>&1 && brew list --versions postgresql >/dev/null 2>&1; then
    log "Starting local PostgreSQL service (Homebrew)..."
    brew services start postgresql
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    warn "No local PostgreSQL service manager found; falling back to Docker."
    ensure_docker_postgres_running
    return 0
  fi

  die "No local PostgreSQL, Homebrew postgresql, or Docker found. Install PostgreSQL 16+ or Docker, or set DATABASE_URL to point at an existing database."
}

DOCKER_PG_CONTAINER="${DOCKER_PG_CONTAINER:-siu-seat-allocation-postgres}"

ensure_docker_postgres_running() {
  require_cmd docker "Install Docker, or install PostgreSQL locally instead."

  if docker ps --format '{{.Names}}' | grep -qx "$DOCKER_PG_CONTAINER"; then
    ok "Docker Postgres container '$DOCKER_PG_CONTAINER' is already running."
    return 0
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx "$DOCKER_PG_CONTAINER"; then
    log "Starting existing Docker Postgres container '$DOCKER_PG_CONTAINER'..."
    docker start "$DOCKER_PG_CONTAINER" >/dev/null
  else
    log "Creating Docker Postgres container '$DOCKER_PG_CONTAINER'..."
    docker run -d \
      --name "$DOCKER_PG_CONTAINER" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_PASSWORD="$DB_PASSWORD" \
      -e POSTGRES_DB="$DB_NAME" \
      -p "$DB_PORT:5432" \
      postgres:16 >/dev/null
  fi

  log "Waiting for Docker Postgres to accept connections..."
  for _ in $(seq 1 30); do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "select 1" >/dev/null 2>&1; then
      ok "Docker Postgres is ready."
      return 0
    fi
    sleep 1
  done
  die "Docker Postgres did not become ready in time."
}

# Idempotently creates the app role and database on a local (non-Docker)
# PostgreSQL install. The Docker path already creates both via env vars.
ensure_role_and_database() {
  require_cmd psql "Install the PostgreSQL client tools (e.g. apt install postgresql-client)."

  local role_exists
  role_exists=$(sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='$DB_USER'" 2>/dev/null || true)
  if [ "$role_exists" != "1" ]; then
    log "Creating database role '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD' CREATEDB;" >/dev/null
  else
    ok "Database role '$DB_USER' already exists."
  fi

  local db_exists
  db_exists=$(sudo -u postgres psql -tAc "select 1 from pg_database where datname='$DB_NAME'" 2>/dev/null || true)
  if [ "$db_exists" != "1" ]; then
    log "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" >/dev/null
  else
    ok "Database '$DB_NAME' already exists."
  fi
}
