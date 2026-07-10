---
name: java-issue-feature
description: Use when extending the Java issue-service (Spring Boot 3.3 / Maven / Java 17) — adds an entity/field/endpoint following its conventions (Flyway owns the schema with ddl-auto none, @Version optimistic locking, X-User-ID identity from gateway, global-unique Jira keys) mirroring the existing Issue domain.
argument-hint: "<feature> (vd: thêm comment cho issue)"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Java issue-feature (Spring Boot)

Mở rộng issue-service theo mô tả: **$ARGUMENTS**. Đây là service Go-khác-biệt duy nhất
(**Java 17 / Spring Boot 3.3 / Maven**). Đọc `services/CLAUDE.md` (mục "Java") + `../CLAUDE.md`
("Lessons") trước. Bám khuôn mẫu thật: `domain/Issue.java`, `web/IssueController.java`,
`repository/IssueRepository.java`, `service/IssueService.java`, `web/GlobalExceptionHandler.java`.

## Quy tắc BẮT BUỘC
- **Flyway SỞ HỮU schema** — `spring.jpa.hibernate.ddl-auto: none`. Thêm bảng/cột qua file mới
  `src/main/resources/db/migration/V<next>__<mô tả>.sql` (Flyway auto-apply lúc boot). **KHÔNG** để
  Hibernate tự tạo/validate: `validate` báo sai kiểu với Postgres `text[]`/`bigint[]`/JSONB (map qua
  hypersistence-utils) → boot fail. Đổi `@Entity`/`@Column` phải đi kèm migration khớp thủ công.
- **@Version optimistic locking** cho update đồng thời: thêm `@Version @Column(name="version")
  private Long version;` + cột `version BIGINT NOT NULL DEFAULT 0` (như `V3__issues_optimistic_lock.sql`).
  2 request cùng sửa 1 row → `ObjectOptimisticLockingFailureException` đã map **409** ở
  `GlobalExceptionHandler` (thay vì lost-update im lặng). KHÔNG tự cầm/so version ở tầng service.
- **Identity từ gateway**: controller nhận `CurrentUser` (do `CurrentUserFilter` bơm từ header
  `X-User-ID`). service dùng `user.userId()`. **KHÔNG** tự verify JWT, KHÔNG đọc identity từ body —
  gateway đã verify + strip mọi `X-User-*` client gửi. Thiếu header → filter tự trả 401.
- **Authz cục bộ**: mọi thao tác scope-workspace gọi `assertProjectMember(actorId, projectId)` —
  resolve project→workspace qua `projects_projection` + membership qua `members_projection`
  (read-model dựng từ Kafka `workspace.events`), **KHÔNG** gọi workspace-service trực tiếp. Không
  thành viên → `NotMemberException` (403); projection chưa tới → `NotFoundException` (404).
- **Key global-unique kiểu Jira**: project/issue key duy nhất TOÀN HỆ THỐNG. Cấp key issue qua
  `KeyAllocator.next(projectId)` (UPSERT `issue_key_seq` + `RETURNING` — nguyên tử dưới đồng thời).
- **Soft-delete**: read repo lọc `...AndDeletedAtIsNull` (derived query); xoá = set `deletedAt`.
  Ref cross-service (project_id/assignee_id/user_id) **KHÔNG FK cứng** — chỉ lưu id + index.
- **Sentinel exceptions** (`common.error`): `ValidationException`→400, `NotMember`/`NotOwner`→403,
  `NotFoundException`→404, `ConflictException`→409 — đã map ở `GlobalExceptionHandler`. Ném đúng loại,
  KHÔNG tự set HTTP status trong controller/service.

## Các bước
1. **Migration**: `V<next>__*.sql` (schema `issue`, `IF NOT EXISTS`, index cho FK/cột query, partial
   unique `WHERE deleted_at IS NULL` cho cột unique soft-delete). Chi tiết → skill `[[create-migration]]`.
2. **domain**: `@Entity @Table(name=..., schema="issue")` khớp cột migration; nếu cần optimistic lock
   thêm `@Version`; getter/setter đầy đủ (không Lombok trong repo này).
3. **repository**: `interface X extends JpaRepository<Entity, Long>` — derived query lọc
   `...AndDeletedAtIsNull`; query native chỉ khi cần (UPSERT/`RETURNING`).
4. **service** (`@Service`, `@Transactional`): `assertProjectMember` trước; phát event Kafka
   `publishAfterCommit(...)` (chỉ phát SAU commit → tránh event "ma").
5. **web**: DTO record + `@Valid`; controller map DTO→command, entity→response `Map.of("x", ...)`;
   nhận `CurrentUser` cho identity. Lỗi để `GlobalExceptionHandler` xử lý.
6. Route mới expose qua gateway → thêm proxy `/x` + `/x/*proxyPath` (nhóm protected) ở api-gateway.

## Verify (BẮT BUỘC trước khi claim xong)
```
JAVA_HOME=/opt/homebrew/opt/openjdk@17 mvn -f services/issue/pom.xml -DskipTests package
```
Có integration test (`@DataJpaTest`/Testcontainers) → bỏ `-DskipTests` để chạy `mvn verify`. Xong `/review`.
