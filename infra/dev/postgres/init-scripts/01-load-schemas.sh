#!/usr/bin/env bash
# PM Platform — Load per-service schemas
#
# Reads SQL files from /shared-schemas/*.sql (mounted from
# infra/shared/postgres/schemas/) and applies them in alphabetical order.
#
# Each SQL file is idempotent (CREATE ... IF NOT EXISTS), safe to re-run,
# but in practice this script only runs once because docker-entrypoint-initdb.d
# is only invoked on empty data volumes.
set -euo pipefail

SCHEMA_DIR=/shared-schemas

if [ ! -d "$SCHEMA_DIR" ]; then
  echo "[schemas] WARN: $SCHEMA_DIR not mounted, skipping schema bootstrap."
  exit 0
fi

shopt -s nullglob
files=("$SCHEMA_DIR"/*.sql)

if [ ${#files[@]} -eq 0 ]; then
  echo "[schemas] No SQL files in $SCHEMA_DIR, skipping."
  exit 0
fi

echo "[schemas] Applying ${#files[@]} schema file(s) from $SCHEMA_DIR ..."

for f in "${files[@]}"; do
  echo "  - $(basename "$f")"
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --file "$f"
done

echo "[schemas] Done. ${#files[@]} schema(s) created."
