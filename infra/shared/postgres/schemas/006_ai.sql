-- ─── ai schema ───────────────────────────────────────────────
-- Owner: ai_user
-- Tables managed by services/ai/migrations/ (golang-migrate).
-- Uses pgvector extension (installed database-wide by 00-init.sh)
-- for embedding columns (e.g., `embedding vector(1536)`).

CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION ai_user;

GRANT USAGE  ON SCHEMA ai TO ai_user;
GRANT CREATE ON SCHEMA ai TO ai_user;

ALTER DEFAULT PRIVILEGES FOR ROLE ai_user IN SCHEMA ai
  GRANT ALL PRIVILEGES ON TABLES    TO ai_user;
ALTER DEFAULT PRIVILEGES FOR ROLE ai_user IN SCHEMA ai
  GRANT ALL PRIVILEGES ON SEQUENCES TO ai_user;
ALTER DEFAULT PRIVILEGES FOR ROLE ai_user IN SCHEMA ai
  GRANT EXECUTE          ON FUNCTIONS TO ai_user;

ALTER ROLE ai_user SET search_path = ai, public;
