#!/usr/bin/env bash
# Status line (CÁ NHÂN, opt-in). Bật trong .claude/settings.local.json (gitignored):
#   { "statusLine": { "type": "command", "command": ".claude/statusline.sh" } }
# Hiện: nhánh git · model · % context đã dùng.
input="$(cat)"
g() { echo "$input" | jq -r "$1 // empty" 2>/dev/null; }
branch="$(g '.git_branch')"; [ -z "$branch" ] && branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
model="$(g '.model.display_name')"; [ -z "$model" ] && model="$(g '.model')"
used="$(g '.context_usage.used')"; [ -z "$used" ] && used="$(g '.cost.total_tokens')"; used="${used:-0}"
max="$(g '.context_usage.max')"; max="${max:-200000}"
pct=0; [ "${max:-0}" -gt 0 ] 2>/dev/null && pct=$(( used * 100 / max ))
printf '⎇ %s · %s · ctx %s%%' "${branch:-?}" "${model:-?}" "$pct"
