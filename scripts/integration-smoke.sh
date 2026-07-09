#!/usr/bin/env bash
# integration-smoke.sh — Phase J end-to-end smoke test cho PM Platform (auth + workspace + gateway).
#
# Khởi động 3 service Go (dùng go run) trỏ vào Postgres + Kafka đang chạy sẵn ở
# localhost, rồi chạy chuỗi curl qua gateway để kiểm chứng luồng đầy đủ:
#   register -> (Kafka) auto default workspace + user projection -> login ->
#   create workspace -> list -> add member -> project -> roles -> authz âm.
#
# Kiểm chứng đặc biệt các fix do workflow audit sinh ra:
#   - Gateway trailing-slash: POST/GET /api/v1/workspaces (collection trần) không redirect-loop.
#   - Kafka at-least-once: default workspace được consumer tạo tự động sau register.
#   - FK projection: add member chạy được vì consumer đã upsert workspace.users.
#
# Yêu cầu: docker (pm-postgres:5432, pm-kafka:9094 đang chạy), go, jq, curl, lsof.
# Không cần migration: DB pmdb đã có schema auth + workspace.
# Để lại infra docker CHẠY; chỉ kill 3 process app khi thoát.
set -uo pipefail

# ---- resolve repo root (script nằm ở <root>/scripts) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

GW="http://localhost:8000"
LOGDIR="$(mktemp -d)"
PASS=0; FAIL=0
declare -a PIDS=()

# ---- nạp env từ .env (ưu tiên) hoặc .env.example (fallback) của TỪNG service ----
# KHÔNG hardcode secret/credential trong script (tránh secret-scanner như GitGuardian):
# giá trị DB URL + JWT secret nằm trong .env* của repo, chỉ nạp lúc runtime.
load_env() { # load_env <service-dir>
  local d="$1" f
  for f in "$d/.env" "$d/.env.example"; do
    if [ -f "$f" ]; then set -a; . "$f"; set +a; return 0; fi
  done
  echo "WARN: không thấy .env/.env.example trong $d"; return 1
}
load_env services/auth
load_env services/workspace
load_env services/api-gateway

# Chạy trên host (không phải trong docker network): ép host docker → localhost bằng
# parameter-expansion trên giá trị ĐÃ nạp → KHÔNG viết credential vào script.
export PM_AUTH_DATABASE_URL="${PM_AUTH_DATABASE_URL//@postgres:/@localhost:}"
export PM_WORKSPACE_DATABASE_URL="${PM_WORKSPACE_DATABASE_URL//@postgres:/@localhost:}"
export PM_AUTH_KAFKA_BROKERS="${PM_AUTH_KAFKA_BROKERS:-localhost:9094}"
export PM_WORKSPACE_KAFKA_BROKERS="${PM_WORKSPACE_KAFKA_BROKERS:-localhost:9094}"
# Upstream gateway mặc định là docker-name (auth-service:...) → override sang localhost.
export PM_API_GATEWAY_UPSTREAM_AUTH_ADDR="localhost:9001"
export PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR="localhost:8001"
export PM_API_GATEWAY_UPSTREAM_WORKSPACE_HTTP_ADDR="localhost:8002"

# Tách user/pass từ DATABASE_URL đã nạp cho psql (không hardcode credential).
_dbcred="${PM_WORKSPACE_DATABASE_URL#*://}"; _dbcred="${_dbcred%%@*}"
DBUSER="${_dbcred%%:*}"; DBPASS="${_dbcred#*:}"

# ---- helpers ----
say()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }

cleanup() {
  say "Teardown (kill app processes, giữ nguyên docker infra)"
  for pid in ${PIDS[@]+"${PIDS[@]}"}; do
    [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null
  done
  # `go run` spawn binary con trong thư mục temp → nó orphan khi parent bị kill,
  # nên quét theo PORT app (bulletproof, chỉ đụng port của 3 service này).
  for p in 8000 8001 8002 9000 9001 9002; do
    lp="$(lsof -ti tcp:$p 2>/dev/null)"
    [ -n "$lp" ] && kill $lp 2>/dev/null
  done
  printf 'Logs còn ở: %s\n' "$LOGDIR"
}
trap cleanup EXIT INT TERM

# start_svc <name> <dir> <cmd-pkg> <health-url>
start_svc() {
  local name="$1" dir="$2" pkg="$3" health="$4"
  say "Khởi động $name"
  ( cd "$dir" && exec go run "$pkg" ) >"$LOGDIR/$name.log" 2>&1 &
  LAST_PID=$!
  PIDS+=("$LAST_PID")
  # go run cần compile lần đầu → poll health tối đa 90s.
  for i in $(seq 1 90); do
    if curl -sf -o /dev/null "$health"; then ok "$name healthy ($health)"; return 0; fi
    if ! kill -0 "$LAST_PID" 2>/dev/null; then
      bad "$name chết khi khởi động — log:"; tail -20 "$LOGDIR/$name.log"; return 1
    fi
    sleep 1
  done
  bad "$name không healthy sau 90s — log:"; tail -20 "$LOGDIR/$name.log"; return 1
}

# req <METHOD> <path> <expected_status> [json_body] [bearer] → set REPLY(body), return 0/1
REPLY=""
req() {
  local method="$1" path="$2" want="$3" body="${4:-}" bearer="${5:-}"
  local args=(-s -X "$method" -o "$LOGDIR/resp.json" -w '%{http_code}' "$GW$path")
  [ -n "$body" ]   && args+=(-H 'Content-Type: application/json' -d "$body")
  [ -n "$bearer" ] && args+=(-H "Authorization: Bearer $bearer")
  local code; code="$(curl "${args[@]}")"
  REPLY="$(cat "$LOGDIR/resp.json" 2>/dev/null)"
  if [ "$code" = "$want" ]; then ok "$method $path → $code"; return 0
  else bad "$method $path → $code (mong đợi $want) | body: ${REPLY:0:200}"; return 1; fi
}

pg() { docker exec -e PGPASSWORD="$DBPASS" pm-postgres psql -U "$DBUSER" -d pmdb -tAc "$1" 2>/dev/null; }

# ==========================================================================
say "Preflight"
docker ps --format '{{.Names}}' | grep -q pm-postgres || { echo "pm-postgres không chạy"; exit 2; }
docker ps --format '{{.Names}}' | grep -q pm-kafka    || { echo "pm-kafka không chạy"; exit 2; }
ok "docker infra (postgres + kafka) đang chạy"

start_svc auth      services/auth      ./cmd/auth        http://localhost:8001/health || exit 1
start_svc workspace services/workspace ./cmd/workspace   http://localhost:8002/health || exit 1
start_svc gateway   services/api-gateway ./cmd/api-gateway http://localhost:8000/health || exit 1
# Cho consumer group workspace-service join xong trước khi register (StartOffset).
sleep 3

# ---- user A ----
TS="$(date +%s)"
EMAIL_A="smoke-a-$TS-$RANDOM@example.com"
EMAIL_B="smoke-b-$TS-$RANDOM@example.com"
PW="password123"

say "1) Register user A (public qua gateway)"
req POST /api/v1/auth/register 201 "{\"email\":\"$EMAIL_A\",\"password\":\"$PW\",\"name\":\"Smoke A\"}" || exit 1
UID_A="$(echo "$REPLY" | jq -r '.user.id')"
[ -n "$UID_A" ] && [ "$UID_A" != "null" ] && ok "user A id=$UID_A" || { bad "không lấy được user A id"; exit 1; }

say "2) Login user A → access_token"
req POST /api/v1/auth/login 200 "{\"email\":\"$EMAIL_A\",\"password\":\"$PW\"}" || exit 1
TOK_A="$(echo "$REPLY" | jq -r '.access_token')"
[ -n "$TOK_A" ] && [ "$TOK_A" != "null" ] && ok "có access_token" || { bad "không có access_token"; exit 1; }

say "3) GET /me (gateway verify JWT qua auth gRPC + inject X-User-ID)"
if req GET /api/v1/me 200 "" "$TOK_A"; then
  ME_ID="$(echo "$REPLY" | jq -r '.user_id')"
  [ "$ME_ID" = "$UID_A" ] && ok "me.user_id khớp ($ME_ID)" || bad "me.user_id=$ME_ID != $UID_A"
fi

say "4) Bảo vệ route: GET /api/v1/workspaces KHÔNG token → 401"
req GET /api/v1/workspaces 401 "" "" && :

say "5) [FIX] POST /api/v1/workspaces (collection trần) → 201, không redirect-loop"
req POST /api/v1/workspaces 201 "{\"name\":\"Acme Corp\"}" "$TOK_A" || exit 1
WS_ID="$(echo "$REPLY" | jq -r '.workspace.id')"
WS_SLUG="$(echo "$REPLY" | jq -r '.workspace.slug')"
ok "workspace tạo id=$WS_ID slug=$WS_SLUG"

say "6) [FIX] GET /api/v1/workspaces (collection trần) → chứa workspace vừa tạo"
if req GET /api/v1/workspaces 200 "" "$TOK_A"; then
  echo "$REPLY" | jq -e --argjson id "$WS_ID" '.workspaces[]?|select(.id==$id)' >/dev/null \
    && ok "list chứa WS_ID=$WS_ID" || bad "list không chứa WS_ID=$WS_ID"
fi

say "7) [FIX Kafka at-least-once] default workspace 'u-$UID_A-default' được consumer tạo tự động"
DEFAULT_SLUG="u-$UID_A-default"
found=0
for i in $(seq 1 30); do
  r="$(curl -s -H "Authorization: Bearer $TOK_A" "$GW/api/v1/workspaces")"
  if echo "$r" | jq -e --arg s "$DEFAULT_SLUG" '.workspaces[]?|select(.slug==$s)' >/dev/null 2>&1; then
    found=1; break
  fi
  sleep 1
done
[ "$found" = 1 ] && ok "default workspace '$DEFAULT_SLUG' xuất hiện (Kafka consumer OK)" \
                 || bad "sau 30s không thấy '$DEFAULT_SLUG' — Kafka consumer chưa provision"

say "8) Register user B + chờ consumer upsert workspace.users projection (FK add-member)"
req POST /api/v1/auth/register 201 "{\"email\":\"$EMAIL_B\",\"password\":\"$PW\",\"name\":\"Smoke B\"}" || exit 1
UID_B="$(echo "$REPLY" | jq -r '.user.id')"
ok "user B id=$UID_B"
proj=0
for i in $(seq 1 30); do
  [ "$(pg "SELECT 1 FROM workspace.users WHERE id=$UID_B")" = "1" ] && { proj=1; break; }
  sleep 1
done
[ "$proj" = 1 ] && ok "projection workspace.users(id=$UID_B) tồn tại (consumer OK)" \
               || bad "sau 30s chưa có projection cho B — add-member sẽ dính FK"

say "9) Owner A add B làm member (user_id + role name)"
req POST "/api/v1/workspaces/$WS_ID/members" 201 "{\"user_id\":$UID_B,\"role\":\"member\"}" "$TOK_A" && :

say "10) List members → chứa B"
if req GET "/api/v1/workspaces/$WS_ID/members" 200 "" "$TOK_A"; then
  echo "$REPLY" | jq -e --argjson id "$UID_B" '.members[]?|select(.user_id==$id)' >/dev/null \
    && ok "members chứa B=$UID_B" || bad "members không chứa B"
fi

say "11) Create project"
req POST "/api/v1/workspaces/$WS_ID/projects" 201 "{\"key\":\"PROJ\",\"name\":\"Project X\"}" "$TOK_A" && :

say "12) List projects → chứa PROJ"
if req GET "/api/v1/workspaces/$WS_ID/projects" 200 "" "$TOK_A"; then
  echo "$REPLY" | jq -e '.projects[]?|select(.key=="PROJ")' >/dev/null \
    && ok "projects chứa PROJ" || bad "projects không chứa PROJ"
fi

say "13) List roles → có owner + member (seed)"
if req GET "/api/v1/workspaces/$WS_ID/roles" 200 "" "$TOK_A"; then
  echo "$REPLY" | jq -e '[.roles[]?.name]|index("owner") and index("member")' >/dev/null \
    && ok "roles có owner + member" || bad "roles thiếu owner/member"
fi

say "14) [authz] B (member, không phải owner) DELETE workspace → 403"
req POST /api/v1/auth/login 200 "{\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" >/dev/null
TOK_B="$(cat "$LOGDIR/resp.json" | jq -r '.access_token')"
req DELETE "/api/v1/workspaces/$WS_ID" 403 "" "$TOK_B" && :

# ==========================================================================
say "KẾT QUẢ"
printf 'PASS=%d  FAIL=%d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "ALL GREEN ✅"; exit 0; } || { echo "CÓ BƯỚC FAIL ❌"; exit 1; }
