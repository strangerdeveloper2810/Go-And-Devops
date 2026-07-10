---
description: Run the full E2E smoke tests locally (starts infra + services, curls through gateway)
argument-hint: "[page|file|both]"
allowed-tools: Bash, Read
---
Chạy E2E smoke toàn hệ thống ở LOCAL (đắt — chỉ khi cần verify cross-service; CI thường dùng
integration/unit test). Cần runtime docker ỔN ĐỊNH (khuyến nghị OrbStack).

1. Kiểm docker: `docker info` + `nc -z localhost 5432`. Nếu daemon chập chờn (Docker Desktop hay
   crash khi thiếu RAM) → báo tôi cài/mở OrbStack, đừng cố retry vô ích.
2. Bring up hạ tầng: `docker compose -f infra/dev/docker-compose.yml up -d postgres kafka minio`.
   Chờ healthy (postgres pg_isready + `nc -z localhost 9094`).
3. Apply migration cho service Go liên quan (issue tự apply qua Flyway):
   `cat services/<svc>/migrations/*.up.sql | docker exec -i -e PGPASSWORD=postgres pm-postgres psql -U postgres -d pmdb -v ON_ERROR_STOP=1`
4. Chạy: `bash scripts/page-integration-smoke.sh` và/hoặc `bash scripts/file-integration-smoke.sh`
   (tùy $ARGUMENTS: "page" / "file" / cả hai). Scripts tự start service (go run) + curl + teardown.
5. Nếu fail: đọc log service trong thư mục tạm mà script in ra; chú ý xung đột port (hạ tầng phải ở
   dải 91xx, không đụng gRPC service 90xx) và Kafka projection timing.

Báo kết quả PASS/FAIL từng bước. E2E cũng có thể chạy trên CI: `gh workflow run backend-ci.yml`
(job e2e là workflow_dispatch). $ARGUMENTS
