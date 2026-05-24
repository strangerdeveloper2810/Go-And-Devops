-- ─── file schema ─────────────────────────────────────────────
-- Owner: file_user
-- Tables managed by services/file/migrations/ (golang-migrate).
-- Actual file bytes live in MinIO; this schema stores metadata only.

CREATE SCHEMA IF NOT EXISTS file AUTHORIZATION file_user;

GRANT USAGE  ON SCHEMA file TO file_user;
GRANT CREATE ON SCHEMA file TO file_user;

ALTER DEFAULT PRIVILEGES FOR ROLE file_user IN SCHEMA file
  GRANT ALL PRIVILEGES ON TABLES    TO file_user;
ALTER DEFAULT PRIVILEGES FOR ROLE file_user IN SCHEMA file
  GRANT ALL PRIVILEGES ON SEQUENCES TO file_user;
ALTER DEFAULT PRIVILEGES FOR ROLE file_user IN SCHEMA file
  GRANT EXECUTE          ON FUNCTIONS TO file_user;

ALTER ROLE file_user SET search_path = file, public;
