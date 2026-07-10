---
description: Review an open PR (or the current branch's PR) by dispatching backend/frontend reviewer agents on the diff
argument-hint: "[PR number] (mặc định: PR của nhánh hiện tại)"
allowed-tools: Bash, Read, Grep, Glob, Agent
---
Review PR **$1** (nếu trống → PR của nhánh hiện tại).

1. Lấy diff: `gh pr diff $1` (hoặc `gh pr view $1 --json ...` cho metadata). Nếu $1 trống →
   `gh pr view --json number` để tìm PR nhánh hiện tại rồi `gh pr diff`.
2. Phân loại file đổi: backend (`services/**` Go/Java) vs frontend (`web/**` React/TS).
3. Dispatch song song:
   - file backend → subagent **backend-reviewer**
   - file frontend → subagent **frontend-reviewer**
   (chia nhỏ theo service nếu diff lớn.)
4. Gộp finding đã xác nhận, xếp severity. Với mỗi finding: `file:line` + kịch bản lỗi + fix gợi ý.
5. (Tuỳ chọn, nếu tôi yêu cầu) post finding thành review comment: `gh pr comment`/`gh pr review`.
   Mặc định chỉ báo cho tôi, KHÔNG tự sửa/approve.

Đối kháng: chỉ defect THẬT, không cosmetic. Bám Lessons trong `CLAUDE.md`. $ARGUMENTS
