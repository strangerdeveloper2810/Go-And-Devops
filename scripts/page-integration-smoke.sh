#!/usr/bin/env bash
# page-integration-smoke.sh — E2E cho page-service (module 4, Confluence core).
# Khởi động auth + workspace (producer) + page (Go) + gateway, chạy luồng:
#   register → login → create workspace (Kafka → page projections) → create space
#   → create page → create child page (hierarchy) → get/list/children → authz âm.
# Yêu cầu: docker (pm-postgres, pm-kafka), go, jq, curl, lsof.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"

GW="http://localhost:8000"; LOGDIR="$(mktemp -d)"; PASS=0; FAIL=0; declare -a PIDS=()

load_env(){ local d="$1" f; for f in "$d/.env" "$d/.env.example"; do [ -f "$f" ] && { set -a; . "$f"; set +a; return 0; }; done; }
load_env services/auth; load_env services/workspace; load_env services/api-gateway
export PM_AUTH_DATABASE_URL="${PM_AUTH_DATABASE_URL//@postgres:/@localhost:}"
export PM_WORKSPACE_DATABASE_URL="${PM_WORKSPACE_DATABASE_URL//@postgres:/@localhost:}"
export PM_AUTH_KAFKA_BROKERS="${PM_AUTH_KAFKA_BROKERS:-localhost:9094}"
export PM_WORKSPACE_KAFKA_BROKERS="${PM_WORKSPACE_KAFKA_BROKERS:-localhost:9094}"
export PM_API_GATEWAY_UPSTREAM_AUTH_ADDR="localhost:9001"
export PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR="localhost:8001"
export PM_API_GATEWAY_UPSTREAM_WORKSPACE_HTTP_ADDR="localhost:8002"
export PM_API_GATEWAY_UPSTREAM_PAGE_HTTP_ADDR="localhost:8004"
_dbcred="${PM_WORKSPACE_DATABASE_URL#*://}"; _dbcred="${_dbcred%%@*}"; DBUSER="${_dbcred%%:*}"; DBPASS="${_dbcred#*:}"
export PM_PAGE_DATABASE_URL="postgres://$DBUSER:$DBPASS@localhost:5432/pmdb?sslmode=disable"
export PM_PAGE_KAFKA_BROKERS="localhost:9094"

say(){ printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok(){ PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }
bad(){ FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
pg(){ docker exec -e PGPASSWORD="$DBPASS" pm-postgres psql -U "$DBUSER" -d pmdb -tAc "$1" 2>/dev/null; }
cleanup(){ say "Teardown"; for pid in ${PIDS[@]+"${PIDS[@]}"}; do [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null; done
  for p in 8000 8001 8002 8004 9001 9002; do lp="$(lsof -ti tcp:$p 2>/dev/null)"; [ -n "$lp" ] && kill $lp 2>/dev/null; done; printf 'Logs: %s\n' "$LOGDIR"; }
trap cleanup EXIT INT TERM
wait_health(){ local n="$1" u="$2" pid="$3" m="${4:-90}"; for i in $(seq 1 "$m"); do curl -sf -o /dev/null "$u" && { ok "$n healthy"; return 0; }
  kill -0 "$pid" 2>/dev/null || { bad "$n chết:"; tail -20 "$LOGDIR/$n.log"; return 1; }; sleep 1; done; bad "$n timeout:"; tail -20 "$LOGDIR/$n.log"; return 1; }
REPLY=""; req(){ local m="$1" p="$2" want="$3" body="${4:-}" tok="${5:-}"; local a=(-s -X "$m" -o "$LOGDIR/r.json" -w '%{http_code}' "$GW$p")
  [ -n "$body" ] && a+=(-H 'Content-Type: application/json' -d "$body"); [ -n "$tok" ] && a+=(-H "Authorization: Bearer $tok")
  local c; c="$(curl "${a[@]}")"; REPLY="$(cat "$LOGDIR/r.json" 2>/dev/null)"
  [ "$c" = "$want" ] && { ok "$m $p → $c"; return 0; } || { bad "$m $p → $c (muốn $want) | ${REPLY:0:200}"; return 1; }; }

say "Preflight — apply page migration (Go service không tự migrate)"
docker ps --format '{{.Names}}' | grep -q pm-kafka || { echo "infra chưa chạy"; exit 2; }
cat services/page/migrations/001_create_page_schema.up.sql | docker exec -i -e PGPASSWORD="$DBPASS" pm-postgres psql -U "$DBUSER" -d pmdb -v ON_ERROR_STOP=1 >/dev/null 2>&1 && ok "page schema applied" || bad "apply migration lỗi"

say "Start services"
( cd services/auth && exec go run ./cmd/auth ) >"$LOGDIR/auth.log" 2>&1 & PIDS+=($!); wait_health auth http://localhost:8001/health $! || exit 1
( cd services/workspace && exec go run ./cmd/workspace ) >"$LOGDIR/workspace.log" 2>&1 & PIDS+=($!); wait_health workspace http://localhost:8002/health $! || exit 1
( cd services/page && exec go run ./cmd/page ) >"$LOGDIR/page.log" 2>&1 & PIDS+=($!); wait_health page http://localhost:8004/health $! || exit 1
( cd services/api-gateway && exec go run ./cmd/api-gateway ) >"$LOGDIR/gateway.log" 2>&1 & PIDS+=($!); wait_health gateway http://localhost:8000/health $! || exit 1
sleep 3

TS="$(date +%s)"; EMAIL="page-$TS-$RANDOM@example.com"; PW="password123"; SKEY="S$(( TS % 100000 ))"
say "1) Register + login"; req POST /api/v1/auth/register 201 "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"name\":\"Page Tester\"}" || exit 1
USERID="$(echo "$REPLY"|jq -r '.user.id')"; ok "user id=$USERID"
req POST /api/v1/auth/login 200 "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" || exit 1; TOK="$(echo "$REPLY"|jq -r '.access_token')"

say "2) Create workspace (Kafka → page projections)"; req POST /api/v1/workspaces 201 "{\"name\":\"Page WS\"}" "$TOK" || exit 1
WS_ID="$(echo "$REPLY"|jq -r '.workspace.id')"; ok "workspace id=$WS_ID"

say "3) Chờ page-service project member (authz)"; mem=0
for i in $(seq 1 30); do [ "$(pg "SELECT 1 FROM page.members_projection WHERE workspace_id=$WS_ID AND user_id=$USERID")" = "1" ] && { mem=1; break; }; sleep 1; done
[ "$mem" = 1 ] && ok "members_projection có ($WS_ID,$USERID)" || bad "member chưa projection sau 30s"

say "4) [CORE] Create space → 201"; req POST /api/v1/spaces 201 "{\"workspaceId\":$WS_ID,\"key\":\"$SKEY\",\"name\":\"Docs\"}" "$TOK" || exit 1
SP_ID="$(echo "$REPLY"|jq -r '.space.id')"; ok "space id=$SP_ID key=$SKEY"

say "5) [authz] non-member tạo space → 403"; E2="page-b-$TS-$RANDOM@example.com"
req POST /api/v1/auth/register 201 "{\"email\":\"$E2\",\"password\":\"$PW\",\"name\":\"Out\"}" >/dev/null
req POST /api/v1/auth/login 200 "{\"email\":\"$E2\",\"password\":\"$PW\"}" >/dev/null; TOK2="$(cat "$LOGDIR/r.json"|jq -r '.access_token')"
req POST /api/v1/spaces 403 "{\"workspaceId\":$WS_ID,\"key\":\"X$SKEY\",\"name\":\"hack\"}" "$TOK2" && :

say "6) [CORE] Create page trong space → 201"; req POST "/api/v1/spaces/$SP_ID/pages" 201 "{\"title\":\"Home\",\"contentHtml\":\"<h1>Hi</h1>\"}" "$TOK" || exit 1
PG_ID="$(echo "$REPLY"|jq -r '.page.id')"; ok "page id=$PG_ID slug=$(echo "$REPLY"|jq -r '.page.slug')"

say "7) [hierarchy] Create child page (parentId)"; req POST "/api/v1/spaces/$SP_ID/pages" 201 "{\"title\":\"Child\",\"parentId\":$PG_ID}" "$TOK" || exit 1
CH_ID="$(echo "$REPLY"|jq -r '.page.id')"; ok "child id=$CH_ID"

say "8) Get page + list pages + list children"
req GET "/api/v1/pages/$PG_ID" 200 "" "$TOK" && :
if req GET "/api/v1/spaces/$SP_ID/pages" 200 "" "$TOK"; then echo "$REPLY"|jq -e --argjson id "$PG_ID" '.pages[]?|select(.id==$id)' >/dev/null && ok "list chứa page $PG_ID" || bad "list thiếu page"; fi
if req GET "/api/v1/pages/$PG_ID/children" 200 "" "$TOK"; then echo "$REPLY"|jq -e --argjson id "$CH_ID" '.pages[]?|select(.id==$id)' >/dev/null && ok "children chứa $CH_ID" || bad "children thiếu"; fi

say "9) List spaces theo workspace"
if req GET "/api/v1/spaces?workspaceId=$WS_ID" 200 "" "$TOK"; then echo "$REPLY"|jq -e --argjson id "$SP_ID" '.spaces[]?|select(.id==$id)' >/dev/null && ok "spaces chứa $SP_ID" || bad "spaces thiếu"; fi

say "KẾT QUẢ"; printf 'PASS=%d FAIL=%d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "ALL GREEN ✅"; exit 0; } || { echo "CÓ FAIL ❌"; exit 1; }
