---
description: Verify a PR is green + mergeable, then squash-merge it into master (guarded — checks first)
argument-hint: "[PR number] (mặc định: PR của nhánh hiện tại)"
allowed-tools: Bash, Read
---
Merge PR **$1** vào master — CHỈ sau khi kiểm tra kỹ.

1. Trạng thái: `gh pr view $1 --json number,state,isDraft,mergeable,mergeStateStatus,baseRefName`.
   - Nếu `isDraft` → hỏi tôi có mark ready không (`gh pr ready $1`).
   - Nếu `mergeable != MERGEABLE` (conflict) → DỪNG, báo tôi (dùng flow resolve conflict: merge base
     vào nhánh, KHÔNG force-push).
2. Checks CI: `gh pr checks $1`. Các check **blocking** (Go/proto/Java) phải xanh. `golangci-lint` là
   advisory (đỏ được). `mergeStateStatus: UNSTABLE` do advisory/GitGuardian false-positive → được merge.
   Nếu blocking check FAIL → DỪNG, báo tôi lý do.
3. Nếu tất cả OK → `gh pr merge $1 --squash --delete-branch`.
   (Nếu tôi đang chạy dưới guardrail "không tự merge master" → thay vì merge, in lệnh cho tôi bấm:
   `gh pr merge $1 --squash --delete-branch`.)
4. Xác nhận merge xong + nhánh đã xoá.

KHÔNG merge nếu blocking check đỏ hoặc conflict. $ARGUMENTS
