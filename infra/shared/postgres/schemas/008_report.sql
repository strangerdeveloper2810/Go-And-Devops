-- ─── report schema ───────────────────────────────────────────
-- Owner: report_user
-- Tables managed by services/report/src/main/resources/db/migration/ (Flyway, Java).
-- Read-side materialized views built from Kafka events.

CREATE SCHEMA IF NOT EXISTS report AUTHORIZATION report_user;

GRANT USAGE  ON SCHEMA report TO report_user;
GRANT CREATE ON SCHEMA report TO report_user;

ALTER DEFAULT PRIVILEGES FOR ROLE report_user IN SCHEMA report
  GRANT ALL PRIVILEGES ON TABLES    TO report_user;
ALTER DEFAULT PRIVILEGES FOR ROLE report_user IN SCHEMA report
  GRANT ALL PRIVILEGES ON SEQUENCES TO report_user;
ALTER DEFAULT PRIVILEGES FOR ROLE report_user IN SCHEMA report
  GRANT EXECUTE          ON FUNCTIONS TO report_user;

ALTER ROLE report_user SET search_path = report, public;
