---
description: Adversarially review the current git diff (backend) for real defects before commit/PR
---
Review các thay đổi backend hiện tại bằng subagent `backend-reviewer`.

1. Chạy `git --no-pager diff` (và `git status`) để lấy phạm vi thay đổi. Nếu đã commit thì
   `git --no-pager diff origin/master...HEAD`.
2. Dispatch subagent **backend-reviewer** trên các file đã đổi (đối kháng: authz/IDOR, SQL/soft-delete,
   Kafka, concurrency, resource/HTTP). Nếu diff lớn (>~6 file) chia theo service.
3. Với mỗi finding được xác nhận: verify build lại (`GOWORK=off go -C services/<svc> build ./... && vet`),
   rồi hỏi tôi trước khi tự sửa (trừ khi tôi nói tự fix).

Trọng tâm: đúng theo Lessons trong `CLAUDE.md`. Chỉ báo defect THẬT, có kịch bản lỗi. $ARGUMENTS
