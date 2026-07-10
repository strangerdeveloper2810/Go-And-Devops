---
description: Create a PR from the current branch following repo conventions (branch off master, draft, body from commits)
argument-hint: "[--ready] [tiêu đề, tuỳ chọn]"
allowed-tools: Bash, Read
---
Tạo PR cho nhánh hiện tại theo convention repo.

Bối cảnh:
- Nhánh + trạng thái: !`git rev-parse --abbrev-ref HEAD; git status --short | head`
- Commit so với master: !`git --no-pager log --oneline origin/master..HEAD 2>/dev/null | head -20`

Các bước:
1. Nếu đang ở `master`/`main` → DỪNG, báo tôi tạo nhánh feature trước (không commit thẳng master).
2. Nếu còn thay đổi chưa commit → hỏi tôi có commit không (message conventional: `feat(x): ...`,
   footer `Co-Authored-By: Claude ...`). KHÔNG commit `.env`/secret.
3. Push nhánh: `git push -u origin <branch>` (KHÔNG `--force`).
4. `gh pr create` (mặc định `--draft` trừ khi tôi ghi `--ready`), `--base master`, title conventional,
   body tóm tắt từ commit + phần "Verify" (build/test đã chạy) + "Trạng thái/Defer". Footer
   "🤖 Generated with Claude Code".
5. In URL PR. **KHÔNG merge** (dùng `/merge-pr` khi CI xanh).

$ARGUMENTS
