#!/usr/bin/env bash
# file-integration-smoke.sh — E2E cho file-service (module 5).
# Khởi động auth + file + gateway (file không cần workspace/kafka — authz owner-based),
# chạy: register → login → upload (multipart) → metadata → download+so byte → list → delete → 404.
# Yêu cầu: docker (pm-postgres, pm-minio), go, jq, curl, lsof.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"
GW="http://localhost:8000"; LOGDIR="$(mktemp -d)"; PASS=0; FAIL=0; declare -a PIDS=()

load_env(){ local d="$1" f; for f in "$d/.env" "$d/.env.example"; do [ -f "$f" ] && { set -a; . "$f"; set +a; return 0; }; done; }
load_env services/auth; load_env services/file; load_env services/api-gateway
export PM_AUTH_DATABASE_URL="${PM_AUTH_DATABASE_URL//@postgres:/@localhost:}"; export PM_AUTH_KAFKA_BROKERS="${PM_AUTH_KAFKA_BROKERS:-localhost:9094}"
export PM_API_GATEWAY_UPSTREAM_AUTH_ADDR="localhost:9001"; export PM_API_GATEWAY_UPSTREAM_AUTH_HTTP_ADDR="localhost:8001"
export PM_API_GATEWAY_UPSTREAM_FILE_HTTP_ADDR="localhost:8005"
_c="${PM_AUTH_DATABASE_URL#*://}"; _c="${_c%%@*}"; DBUSER="${_c%%:*}"; DBPASS="${_c#*:}"
export PM_FILE_DATABASE_URL="${PM_FILE_DATABASE_URL//@postgres:/@localhost:}"
export PM_FILE_MINIO_ENDPOINT="${PM_FILE_MINIO_ENDPOINT:-localhost:9000}"

say(){ printf '\n\033[1m== %s ==\033[0m\n' "$*"; }; ok(){ PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }; bad(){ FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
cleanup(){ say "Teardown"; for pid in ${PIDS[@]+"${PIDS[@]}"}; do [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null; done
  for p in 8000 8001 8005 9001; do lp="$(lsof -ti tcp:$p 2>/dev/null)"; [ -n "$lp" ] && kill $lp 2>/dev/null; done; printf 'Logs: %s\n' "$LOGDIR"; }
trap cleanup EXIT INT TERM
wait_health(){ local n="$1" u="$2" pid="$3" m="${4:-90}"; for i in $(seq 1 "$m"); do curl -sf -o /dev/null "$u" && { ok "$n healthy"; return 0; }
  kill -0 "$pid" 2>/dev/null || { bad "$n chết:"; tail -20 "$LOGDIR/$n.log"; return 1; }; sleep 1; done; bad "$n timeout:"; tail -20 "$LOGDIR/$n.log"; return 1; }
REPLY=""; req(){ local m="$1" p="$2" want="$3" body="${4:-}" tok="${5:-}"; local a=(-s -X "$m" -o "$LOGDIR/r.json" -w '%{http_code}' "$GW$p")
  [ -n "$body" ] && a+=(-H 'Content-Type: application/json' -d "$body"); [ -n "$tok" ] && a+=(-H "Authorization: Bearer $tok")
  local c; c="$(curl "${a[@]}")"; REPLY="$(cat "$LOGDIR/r.json" 2>/dev/null)"; [ "$c" = "$want" ] && { ok "$m $p → $c"; return 0; } || { bad "$m $p → $c (muốn $want) | ${REPLY:0:200}"; return 1; }; }

say "Preflight — apply file migration + check MinIO"
docker ps --format '{{.Names}}' | grep -q pm-minio || { echo "pm-minio chưa chạy"; exit 2; }
cat services/file/migrations/001_create_file_schema.up.sql | docker exec -i -e PGPASSWORD="$DBPASS" pm-postgres psql -U "$DBUSER" -d pmdb -v ON_ERROR_STOP=1 >/dev/null 2>&1 && ok "file schema applied" || bad "apply migration lỗi"

say "Start services (auth + file + gateway)"
( cd services/auth && exec go run ./cmd/auth ) >"$LOGDIR/auth.log" 2>&1 & PIDS+=($!); wait_health auth http://localhost:8001/health $! || exit 1
( cd services/file && exec go run ./cmd/file ) >"$LOGDIR/file.log" 2>&1 & PIDS+=($!); wait_health file http://localhost:8005/health $! || exit 1
( cd services/api-gateway && exec go run ./cmd/api-gateway ) >"$LOGDIR/gateway.log" 2>&1 & PIDS+=($!); wait_health gateway http://localhost:8000/health $! || exit 1
sleep 2

TS="$(date +%s)"; EMAIL="file-$TS-$RANDOM@example.com"; PW="password123"
say "1) Register + login"; req POST /api/v1/auth/register 201 "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"name\":\"File Tester\"}" || exit 1
req POST /api/v1/auth/login 200 "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" || exit 1; TOK="$(echo "$REPLY"|jq -r '.access_token')"

say "2) [CORE] Upload file (multipart) → 201"
SRC="$LOGDIR/upload.txt"; printf 'hello pm-platform file-service %s\n' "$TS" > "$SRC"; SRCSUM="$(shasum "$SRC"|awk '{print $1}')"
code="$(curl -s -X POST -H "Authorization: Bearer $TOK" -F "file=@$SRC" -o "$LOGDIR/up.json" -w '%{http_code}' "$GW/api/v1/files")"
[ "$code" = "201" ] && ok "POST /api/v1/files → 201" || { bad "upload → $code | $(cat "$LOGDIR/up.json")"; exit 1; }
FID="$(jq -r '.file.id' "$LOGDIR/up.json")"; ok "file id=$FID name=$(jq -r '.file.name' "$LOGDIR/up.json") size=$(jq -r '.file.size' "$LOGDIR/up.json") s3=$(jq -r '.file.s3_key' "$LOGDIR/up.json")"

say "3) Get metadata"; req GET "/api/v1/files/$FID" 200 "" "$TOK" && { echo "$REPLY"|jq -e '.file.mime!=null' >/dev/null && ok "metadata có mime" || bad "metadata thiếu"; }

say "4) [CORE] Download content → so byte với bản gốc (MinIO round-trip)"
code="$(curl -s -H "Authorization: Bearer $TOK" -o "$LOGDIR/down.bin" -w '%{http_code}' "$GW/api/v1/files/$FID/content")"
DSTSUM="$(shasum "$LOGDIR/down.bin"|awk '{print $1}')"
[ "$code" = "200" ] && ok "download → 200" || bad "download → $code"
[ "$SRCSUM" = "$DSTSUM" ] && ok "nội dung khớp (sha $SRCSUM)" || bad "nội dung LỆCH: $SRCSUM vs $DSTSUM"

say "5) List file của caller"; if req GET /api/v1/files 200 "" "$TOK"; then echo "$REPLY"|jq -e --argjson id "$FID" '.files[]?|select(.id==$id)' >/dev/null && ok "list chứa $FID" || bad "list thiếu"; fi

say "6) [authz] user khác DELETE → 403"
E2="file-b-$TS-$RANDOM@example.com"; req POST /api/v1/auth/register 201 "{\"email\":\"$E2\",\"password\":\"$PW\",\"name\":\"Out\"}" >/dev/null
req POST /api/v1/auth/login 200 "{\"email\":\"$E2\",\"password\":\"$PW\"}" >/dev/null; TOK2="$(cat "$LOGDIR/r.json"|jq -r '.access_token')"
req DELETE "/api/v1/files/$FID" 403 "" "$TOK2" && :

say "7) Owner DELETE → 204, rồi GET → 404"
req DELETE "/api/v1/files/$FID" 204 "" "$TOK" && :
req GET "/api/v1/files/$FID" 404 "" "$TOK" && :

say "KẾT QUẢ"; printf 'PASS=%d FAIL=%d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "ALL GREEN ✅"; exit 0; } || { echo "CÓ FAIL ❌"; exit 1; }
