-- ─── issue schema ────────────────────────────────────────────
-- Owner: issue_user
-- Tables managed by services/issue/src/main/resources/db/migration/ (Flyway, Java)

CREATE SCHEMA IF NOT EXISTS issue AUTHORIZATION issue_user;

GRANT USAGE  ON SCHEMA issue TO issue_user;
GRANT CREATE ON SCHEMA issue TO issue_user;

ALTER DEFAULT PRIVILEGES FOR ROLE issue_user IN SCHEMA issue
  GRANT ALL PRIVILEGES ON TABLES    TO issue_user;
ALTER DEFAULT PRIVILEGES FOR ROLE issue_user IN SCHEMA issue
  GRANT ALL PRIVILEGES ON SEQUENCES TO issue_user;
ALTER DEFAULT PRIVILEGES FOR ROLE issue_user IN SCHEMA issue
  GRANT EXECUTE          ON FUNCTIONS TO issue_user;

ALTER ROLE issue_user SET search_path = issue, public;
