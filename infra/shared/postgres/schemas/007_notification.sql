-- ─── notification schema ─────────────────────────────────────
-- Owner: notification_user
-- Tables managed by services/notification/src/main/resources/db/migration/ (Flyway, Java)

CREATE SCHEMA IF NOT EXISTS notification AUTHORIZATION notification_user;

GRANT USAGE  ON SCHEMA notification TO notification_user;
GRANT CREATE ON SCHEMA notification TO notification_user;

ALTER DEFAULT PRIVILEGES FOR ROLE notification_user IN SCHEMA notification
  GRANT ALL PRIVILEGES ON TABLES    TO notification_user;
ALTER DEFAULT PRIVILEGES FOR ROLE notification_user IN SCHEMA notification
  GRANT ALL PRIVILEGES ON SEQUENCES TO notification_user;
ALTER DEFAULT PRIVILEGES FOR ROLE notification_user IN SCHEMA notification
  GRANT EXECUTE          ON FUNCTIONS TO notification_user;

ALTER ROLE notification_user SET search_path = notification, public;
