-- ─── workspace schema ────────────────────────────────────────
-- Owner: workspace_user
-- Tables managed by services/workspace/migrations/ (golang-migrate)

CREATE SCHEMA IF NOT EXISTS workspace AUTHORIZATION workspace_user;

GRANT USAGE  ON SCHEMA workspace TO workspace_user;
GRANT CREATE ON SCHEMA workspace TO workspace_user;

ALTER DEFAULT PRIVILEGES FOR ROLE workspace_user IN SCHEMA workspace
  GRANT ALL PRIVILEGES ON TABLES    TO workspace_user;
ALTER DEFAULT PRIVILEGES FOR ROLE workspace_user IN SCHEMA workspace
  GRANT ALL PRIVILEGES ON SEQUENCES TO workspace_user;
ALTER DEFAULT PRIVILEGES FOR ROLE workspace_user IN SCHEMA workspace
  GRANT EXECUTE          ON FUNCTIONS TO workspace_user;

ALTER ROLE workspace_user SET search_path = workspace, public;
