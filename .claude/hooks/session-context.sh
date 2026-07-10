#!/usr/bin/env bash
# SessionStart hook — bơm context định hướng ngắn gọn đầu phiên (stdout → additionalContext).
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
cat <<CTX
PM Platform · nhánh: $branch · $dirty file chưa commit.
Nhắc: theo CLAUDE.md (patterns + lessons). Verify Go: GOWORK=off go -C services/<svc> build ./... && vet, gofmt -l.
E2E đắt → chạy TAY (/e2e hoặc gh workflow run backend-ci.yml). Không tự push/merge master (guardrail).
CTX
exit 0
