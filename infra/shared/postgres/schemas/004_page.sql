-- ─── page schema ─────────────────────────────────────────────
-- Owner: page_user
-- Tables managed by services/page/migrations/ (golang-migrate).
-- Note: pages.yjs_state is BYTEA storing the Yjs Y.Doc; Hocuspocus
-- (services/collab-server, Node) also writes here via its own DB role.
-- For dev simplicity, collab-server reuses page_user; a stricter
-- production setup would create a dedicated collab_user with narrow grants.

CREATE SCHEMA IF NOT EXISTS page AUTHORIZATION page_user;

GRANT USAGE  ON SCHEMA page TO page_user;
GRANT CREATE ON SCHEMA page TO page_user;

ALTER DEFAULT PRIVILEGES FOR ROLE page_user IN SCHEMA page
  GRANT ALL PRIVILEGES ON TABLES    TO page_user;
ALTER DEFAULT PRIVILEGES FOR ROLE page_user IN SCHEMA page
  GRANT ALL PRIVILEGES ON SEQUENCES TO page_user;
ALTER DEFAULT PRIVILEGES FOR ROLE page_user IN SCHEMA page
  GRANT EXECUTE          ON FUNCTIONS TO page_user;

ALTER ROLE page_user SET search_path = page, public;
