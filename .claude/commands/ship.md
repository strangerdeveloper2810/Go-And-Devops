---
description: Orchestrator — coordinate sub-agents to ship a change end-to-end (verify → review BE/FE → write tests → create PR)
argument-hint: "[mô tả thay đổi / phạm vi, tuỳ chọn]"
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, Agent
---
Bạn là **orchestrator**: điều phối các subagent + skill để đưa thay đổi hiện tại lên PR một cách
chắc chắn. Chạy ở main loop (được phép dispatch agent). Đọc `CLAUDE.md` trước.

Phạm vi thay đổi:
- !`git status --short | head -30`
- !`git --no-pager diff --stat 2>/dev/null | tail -20`

## Pipeline (dừng + hỏi tôi ở checkpoint nếu có vấn đề nghiêm trọng)
1. **Verify build**: với mỗi Go module đổi → `GOWORK=off go -C services/<svc> build ./... && vet` +
   `gofmt -l`; Java → `mvn -f services/issue/pom.xml -DskipTests compile`; FE → `npm run typecheck`.
   Nếu vỡ → sửa (hoặc báo tôi) TRƯỚC khi tiếp.
2. **Review đối kháng (song song)**: dispatch **backend-reviewer** cho file `services/**`, và
   **frontend-reviewer** cho file `web/**` (chia theo service nếu diff lớn). Gộp finding đã xác nhận.
   - Có finding **critical/high** → báo tôi + đề xuất fix, hỏi có tự sửa không (mặc định hỏi). Fix xong
     verify build lại.
3. **Test (nếu thiếu)**: dispatch **test-author** viết integration/unit test cho hành vi mới + các
   lesson dễ sai (authz/soft-delete/idempotency...). Chạy test tới khi xanh. (Bỏ qua nếu tôi nói "no test".)
4. **PR**: theo `/create-pr` — commit (nếu cần, conventional message), push nhánh, `gh pr create --draft`
   base master, body tóm tắt thay đổi + Verify + finding còn lại (advisory) + Defer. In URL.
5. **Tổng kết**: build/review/test/PR trạng thái. KHÔNG tự merge master (dùng `/merge-pr`).

Điều phối gọn: review + test có thể chạy song song nếu độc lập. Report ngắn ở mỗi bước. $ARGUMENTS
