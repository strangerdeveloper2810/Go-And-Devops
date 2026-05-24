#!/usr/bin/env bash
# PM Platform — Postgres bootstrap
#
# This script runs once when the Postgres container's data volume is empty
# (per Postgres official image convention: `/docker-entrypoint-initdb.d`).
#
# Responsibilities:
#   1. Enable required extensions (pgvector, citext, pgcrypto)
#   2. Create per-service DB users (least-privilege: each owns its own schema)
#   3. Schemas themselves are created in step 3 (../../../shared/postgres/schemas/*.sql)
#
# To reset: docker compose down -v && docker compose up -d
set -euo pipefail

echo "[init] Enabling extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS citext;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

echo "[init] Creating per-service users..."

# Map: service_name → env var holding the password.
declare -A SERVICES=(
  [auth]="${DB_PASSWORD_AUTH:-auth_pwd_dev}"
  [workspace]="${DB_PASSWORD_WORKSPACE:-workspace_pwd_dev}"
  [issue]="${DB_PASSWORD_ISSUE:-issue_pwd_dev}"
  [page]="${DB_PASSWORD_PAGE:-page_pwd_dev}"
  [file]="${DB_PASSWORD_FILE:-file_pwd_dev}"
  [ai]="${DB_PASSWORD_AI:-ai_pwd_dev}"
  [notification]="${DB_PASSWORD_NOTIFICATION:-notif_pwd_dev}"
  [report]="${DB_PASSWORD_REPORT:-report_pwd_dev}"
  [audit]="${DB_PASSWORD_AUDIT:-audit_pwd_dev}"
)

for svc in "${!SERVICES[@]}"; do
  pwd="${SERVICES[$svc]}"
  echo "  - ${svc}_user"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${svc}_user') THEN
        CREATE ROLE ${svc}_user LOGIN PASSWORD '${pwd}';
      END IF;
    END
    \$\$;
EOSQL
done

echo "[init] Done. Schemas + grants are applied by ../../../shared/postgres/schemas/*.sql in step 3."
