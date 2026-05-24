-- ─── audit schema ────────────────────────────────────────────
-- Owner: audit_user
-- Tables managed by services/audit/src/main/resources/db/migration/ (Flyway, Java).
-- Append-only event log, partitioned by month.

CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION audit_user;

GRANT USAGE  ON SCHEMA audit TO audit_user;
GRANT CREATE ON SCHEMA audit TO audit_user;

ALTER DEFAULT PRIVILEGES FOR ROLE audit_user IN SCHEMA audit
  GRANT ALL PRIVILEGES ON TABLES    TO audit_user;
ALTER DEFAULT PRIVILEGES FOR ROLE audit_user IN SCHEMA audit
  GRANT ALL PRIVILEGES ON SEQUENCES TO audit_user;
ALTER DEFAULT PRIVILEGES FOR ROLE audit_user IN SCHEMA audit
  GRANT EXECUTE          ON FUNCTIONS TO audit_user;

ALTER ROLE audit_user SET search_path = audit, public;
