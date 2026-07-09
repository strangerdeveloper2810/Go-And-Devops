#!/usr/bin/env bash
# issue-integration-smoke.sh — E2E cho vertical slice issue-service (module 3).
#
# Khởi động auth (Go), workspace (Go, có producer workspace.events), issue (Java jar),
# gateway (Go) trỏ vào Postgres + Kafka đang chạy, rồi chạy luồng:
#   register -> login -> create workspace (Kafka: workspace.created + member.added)
#   -> create project (Kafka: project.created) -> chờ issue-service projection
#   -> create issue PROJ-1 -> transition To Do->In Progress -> get -> list.
#
# Kiểm chứng: workspace.events producer + issue-service Kafka projections + authz theo
# projection + auto-key + workflow transition, tất cả qua gateway (X-User-ID injected).
#
# Yêu cầu: docker (pm-postgres:5432, pm-kafka:9094), go, java 17, jq, curl, lsof.
# issue jar phải build sẵn: mvn -f services/issue/pom.xml -DskipTests package
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"

GW="http://localhost:8000"
LOGDIR="$(mktemp -d)"
PASS=0; FAIL=0
declare -a PIDS=()

# ---- env: nạp .env* của từng Go service, không hardcode secret (bài học GitGuardian) ----
load_env() { local d="$1" f; for f in "$d/.env" "$d/.env.example"; do
  [ -f "$f" ] && { set -a; . "$f"; set +a; return 0; }; done; return 1; }
load_env services/auth; load_env services/workspace; load_env services/api-gateway
export PM_AUTH_DATABASE_URL="${PM_AUTH_DATABASE_URL//@postgres:/@localhost:}"
export PM_WORKSPACE_DATABASE_URL="${PM_WORKSPACE_DATABASE_URL//@postgres:/@localhost:}"
export PM_AUTH_KAFKA_BROKERS="${PM_AUTH_KAFKA_BROKERS:-localhost:9094}"
export PM_WORKSPACE_KAFKA_BROKERS="${PM_WORKSPACE_KAFKA_BROKERS:-localhost:9094}"
export PM_API_GATEWAY_UPSTREAM_AUTH_ADDR="localhost:9001"
export PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR="localhost:8001"
export PM_API_GATEWAY_UPSTREAM_WORKSPACE_HTTP_ADDR="localhost:8002"
export PM_API_GATEWAY_UPSTREAM_ISSUE_HTTP_ADDR="localhost:8003"
# issue-service (Java) — DB creds tách từ workspace URL đã nạp (không hardcode)
_dbcred="${PM_WORKSPACE_DATABASE_URL#*://}"; _dbcred="${_dbcred%%@*}"
DBUSER="${_dbcred%%:*}"; DBPASS="${_dbcred#*:}"
export PM_ISSUE_DATABASE_URL="jdbc:postgresql://localhost:5432/pmdb?currentSchema=issue"
export PM_ISSUE_DATABASE_USER="$DBUSER"
export PM_ISSUE_DATABASE_PASSWORD="$DBPASS"
export PM_ISSUE_KAFKA_BROKERS="localhost:9094"

say(){ printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok(){ PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }
bad(){ FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
pg(){ docker exec -e PGPASSWORD="$DBPASS" pm-postgres psql -U "$DBUSER" -d pmdb -tAc "$1" 2>/dev/null; }

cleanup(){ say "Teardown (kill app processes, giữ docker infra)"
  for pid in ${PIDS[@]+"${PIDS[@]}"}; do [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null; done
  for p in 8000 8001 8002 8003 9000 9001 9002; do lp="$(lsof -ti tcp:$p 2>/dev/null)"; [ -n "$lp" ] && kill $lp 2>/dev/null; done
  printf 'Logs: %s\n' "$LOGDIR"; }
trap cleanup EXIT INT TERM

wait_health(){ local name="$1" url="$2" pid="$3" max="${4:-90}"
  for i in $(seq 1 "$max"); do
    curl -sf -o /dev/null "$url" && { ok "$name healthy"; return 0; }
    kill -0 "$pid" 2>/dev/null || { bad "$name chết — log:"; tail -25 "$LOGDIR/$name.log"; return 1; }
    sleep 1; done
  bad "$name không healthy sau ${max}s — log:"; tail -25 "$LOGDIR/$name.log"; return 1; }

REPLY=""
req(){ local m="$1" p="$2" want="$3" body="${4:-}" tok="${5:-}"
  local a=(-s -X "$m" -o "$LOGDIR/r.json" -w '%{http_code}' "$GW$p")
  [ -n "$body" ] && a+=(-H 'Content-Type: application/json' -d "$body")
  [ -n "$tok" ] && a+=(-H "Authorization: Bearer $tok")
  local c; c="$(curl "${a[@]}")"; REPLY="$(cat "$LOGDIR/r.json" 2>/dev/null)"
  [ "$c" = "$want" ] && { ok "$m $p → $c"; return 0; } || { bad "$m $p → $c (muốn $want) | ${REPLY:0:220}"; return 1; }; }

# ==========================================================================
say "Preflight"
docker ps --format '{{.Names}}' | grep -q pm-postgres && docker ps --format '{{.Names}}' | grep -q pm-kafka \
  && ok "infra postgres+kafka up" || { echo "infra chưa chạy"; exit 2; }
[ -f services/issue/target/issue-service-0.1.0.jar ] || { echo "chưa có issue jar — chạy: mvn -f services/issue/pom.xml -DskipTests package"; exit 2; }

say "Start services"
( cd services/auth && exec go run ./cmd/auth ) >"$LOGDIR/auth.log" 2>&1 & PIDS+=($!); AUTH=$!
wait_health auth http://localhost:8001/health "$AUTH" || exit 1
( cd services/workspace && exec go run ./cmd/workspace ) >"$LOGDIR/workspace.log" 2>&1 & PIDS+=($!); WS=$!
wait_health workspace http://localhost:8002/health "$WS" || exit 1
( exec java -jar services/issue/target/issue-service-0.1.0.jar ) >"$LOGDIR/issue.log" 2>&1 & PIDS+=($!); ISSUE=$!
wait_health issue http://localhost:8003/actuator/health "$ISSUE" 120 || exit 1
( cd services/api-gateway && exec go run ./cmd/api-gateway ) >"$LOGDIR/gateway.log" 2>&1 & PIDS+=($!); GWPID=$!
wait_health gateway http://localhost:8000/health "$GWPID" || exit 1
sleep 3  # cho consumer group join

TS="$(date +%s)"; EMAIL="issue-$TS-$RANDOM@example.com"; PW="password123"; PKEY="K$(( TS % 100000 ))"

say "1) Register + login"
req POST /api/v1/auth/register 201 "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"name\":\"Issue Tester\"}" || exit 1
USERID="$(echo "$REPLY" | jq -r '.user.id')"; ok "user id=$USERID"
req POST /api/v1/auth/login 200 "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" || exit 1
TOK="$(echo "$REPLY" | jq -r '.access_token')"; [ -n "$TOK" ] && ok "có token" || exit 1

say "2) Create workspace (Kafka: workspace.created + owner member.added)"
req POST /api/v1/workspaces 201 "{\"name\":\"Issue WS\"}" "$TOK" || exit 1
WS_ID="$(echo "$REPLY" | jq -r '.workspace.id')"; ok "workspace id=$WS_ID"

say "3) Create project (Kafka: project.created)"
req POST "/api/v1/workspaces/$WS_ID/projects" 201 "{\"key\":\"$PKEY\",\"name\":\"Issue Proj\"}" "$TOK" || exit 1
PROJ_ID="$(echo "$REPLY" | jq -r '.project.id')"; ok "project id=$PROJ_ID key=$PKEY"

say "4) Chờ issue-service consume project.created + member.added → projection"
proj_ok=0; mem_ok=0
for i in $(seq 1 30); do
  [ "$(pg "SELECT 1 FROM issue.projects_projection WHERE id=$PROJ_ID")" = "1" ] && proj_ok=1
  [ "$(pg "SELECT 1 FROM issue.members_projection WHERE workspace_id=$WS_ID AND user_id=$USERID")" = "1" ] && mem_ok=1
  [ "$proj_ok" = 1 ] && [ "$mem_ok" = 1 ] && break; sleep 1
done
[ "$proj_ok" = 1 ] && ok "projects_projection có project $PROJ_ID (workspace.events OK)" || bad "project chưa projection sau 30s"
[ "$mem_ok" = 1 ] && ok "members_projection có ($WS_ID,$USERID) (authz sẵn sàng)" || bad "member chưa projection sau 30s"

say "5) Lấy typeId hệ thống (Task) từ seed"
TYPE_ID="$(pg "SELECT id FROM issue.issue_types WHERE name='Task' AND project_id IS NULL LIMIT 1")"
[ -n "$TYPE_ID" ] && ok "typeId(Task)=$TYPE_ID" || { bad "không thấy seeded issue type"; }

say "6) [CORE] Create issue → 201, key auto ISU-1"
req POST "/api/v1/projects/$PROJ_ID/issues" 201 "{\"typeId\":$TYPE_ID,\"summary\":\"First issue\",\"priority\":\"high\"}" "$TOK" || exit 1
ISS_KEY="$(echo "$REPLY" | jq -r '.issue.key')"; ISS_STATUS="$(echo "$REPLY" | jq -r '.issue.status')"
echo "$ISS_KEY" | grep -q "^${PKEY}-" && ok "issue key=$ISS_KEY status=$ISS_STATUS reporter=$(echo "$REPLY"|jq -r '.issue.reporterId')" || bad "key sai: $ISS_KEY"

say "7) [authz] non-member tạo issue → 403"
E2="issue-b-$TS-$RANDOM@example.com"
req POST /api/v1/auth/register 201 "{\"email\":\"$E2\",\"password\":\"$PW\",\"name\":\"Outsider\"}" >/dev/null
req POST /api/v1/auth/login 200 "{\"email\":\"$E2\",\"password\":\"$PW\"}" >/dev/null; TOK2="$(cat "$LOGDIR/r.json"|jq -r '.access_token')"
req POST "/api/v1/projects/$PROJ_ID/issues" 403 "{\"typeId\":$TYPE_ID,\"summary\":\"hack\"}" "$TOK2" && :

say "8) [workflow] transition $ISS_KEY → In Progress → 200"
req POST "/api/v1/issues/$ISS_KEY/transitions" 200 "{\"toStatus\":\"In Progress\"}" "$TOK" && {
  echo "$REPLY" | jq -e '.issue.status=="In Progress"' >/dev/null && ok "status = In Progress" || bad "status không đổi"; }

say "9) [workflow] transition bất hợp lệ → 409"
req POST "/api/v1/issues/$ISS_KEY/transitions" 409 "{\"toStatus\":\"NopeState\"}" "$TOK" && :

say "10) Get + List"
req GET "/api/v1/issues/$ISS_KEY" 200 "" "$TOK" && :
if req GET "/api/v1/projects/$PROJ_ID/issues" 200 "" "$TOK"; then
  echo "$REPLY" | jq -e --arg k "$ISS_KEY" '.issues[]?|select(.key==$k)' >/dev/null && ok "list chứa $ISS_KEY" || bad "list thiếu $ISS_KEY"; fi

say "KẾT QUẢ"; printf 'PASS=%d FAIL=%d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "ALL GREEN ✅"; exit 0; } || { echo "CÓ FAIL ❌"; exit 1; }
