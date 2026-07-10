#!/usr/bin/env bash
# PreToolUse(Bash) guard — chặn lệnh phá huỷ KHÔNG thể hoàn tác (defense-in-depth,
# bổ sung cho permissions.deny). Nhận hook JSON qua stdin; exit 2 = chặn (message ra stderr → Claude thấy).
set -euo pipefail
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null || true)"
[ -z "$cmd" ] && exit 0

block() { echo "⛔ Chặn lệnh nguy hiểm ($1). Nếu thật sự cần, chạy tay ngoài Claude." >&2; exit 2; }

case "$cmd" in
  *"rm -rf /"*|*"rm -fr /"*|*"rm -rf ~"*|*"rm -rf \$HOME"*) block "rm -rf vào / hoặc HOME" ;;
  *"git push --force"*|*"git push -f "*|*"git push -f")      block "git push --force — dùng --force-with-lease + review" ;;
  *":(){ :|:& };:"*)                                          block "fork bomb" ;;
  *"mkfs"*|*"dd if="*of=/dev/*)                               block "ghi đè thiết bị đĩa" ;;
esac
exit 0
