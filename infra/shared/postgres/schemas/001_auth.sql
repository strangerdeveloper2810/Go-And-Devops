-- ─── auth schema ─────────────────────────────────────────────
-- Owner: auth_user
-- Tables managed by services/auth/migrations/ (golang-migrate)
--
-- Idempotent: safe to re-run.

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION auth_user;

GRANT USAGE  ON SCHEMA auth TO auth_user;
GRANT CREATE ON SCHEMA auth TO auth_user;

-- Default privileges for objects created later by auth_user
ALTER DEFAULT PRIVILEGES FOR ROLE auth_user IN SCHEMA auth
  GRANT ALL PRIVILEGES ON TABLES    TO auth_user;
ALTER DEFAULT PRIVILEGES FOR ROLE auth_user IN SCHEMA auth
  GRANT ALL PRIVILEGES ON SEQUENCES TO auth_user;
ALTER DEFAULT PRIVILEGES FOR ROLE auth_user IN SCHEMA auth
  GRANT EXECUTE          ON FUNCTIONS TO auth_user;

-- Default search_path so service queries don't need to prefix schema
ALTER ROLE auth_user SET search_path = auth, public;
