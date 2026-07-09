package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Issue;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issues. Hầu hết query lọc deleted_at IS NULL (bỏ qua bản xoá mềm).
 */
public interface IssueRepository extends JpaRepository<Issue, Long> {

    // List issue còn sống của 1 project (bỏ qua đã xoá mềm)
    List<Issue> findByProjectIdAndDeletedAtIsNull(Long projectId);

    // Lấy TẤT CẢ issue còn sống trùng key. Key KHÔNG duy nhất toàn cục: key = "<projectKey>-<n>"
    // mà projectKey chỉ UNIQUE trong 1 workspace (workspace.projects UNIQUE(workspace_id,key)) và
    // issue chỉ partial-unique theo (project_id,key) → 2 workspace khác nhau có thể cùng đẻ "API-1".
    List<Issue> findAllByKeyAndDeletedAtIsNull(String key);

    // Wrapper giữ chữ ký Optional cho caller (IssueService.getExistingByKey). Vì key có thể va chạm
    // toàn cục, KHÔNG dùng derived query trả single-result (sẽ ném IncorrectResultSizeDataAccessException
    // → 500 cho CẢ 2 tenant khi trùng). Ở đây chọn xác định (id nhỏ nhất) thay vì để rơi xuống 500.
    // LƯU Ý: đây chỉ là chốt phòng thủ chống 500/DoS; sửa triệt để nhập nhằng cross-tenant cần scope
    // route theo project (/projects/{id}/issues/{key} + findByProjectIdAndKey...) — ngoài phạm vi file này.
    default Optional<Issue> findByKeyAndDeletedAtIsNull(String key) {
        return findAllByKeyAndDeletedAtIsNull(key).stream()
                .min(Comparator.comparing(Issue::getId));
    }

    // Lấy issue theo (project, key) còn sống
    Optional<Issue> findByProjectIdAndKeyAndDeletedAtIsNull(Long projectId, String key);

    // Kiểm tra trùng key trong project (dùng khi cấp key / validate)
    boolean existsByProjectIdAndKey(Long projectId, String key);

    // Subtask của 1 issue cha
    List<Issue> findByParentIdAndDeletedAtIsNull(Long parentId);

    // Issue trong 1 sprint
    List<Issue> findBySprintIdAndDeletedAtIsNull(Long sprintId);

    // Lọc theo status (dựng board / report)
    List<Issue> findByProjectIdAndStatusAndDeletedAtIsNull(Long projectId, String status);

    // Lọc theo assignee
    List<Issue> findByProjectIdAndAssigneeIdAndDeletedAtIsNull(Long projectId, Long assigneeId);
}
