package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Issue;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issues. Hầu hết query lọc deleted_at IS NULL (bỏ qua bản xoá mềm).
 */
public interface IssueRepository extends JpaRepository<Issue, Long> {

    // List issue còn sống của 1 project (bỏ qua đã xoá mềm)
    List<Issue> findByProjectIdAndDeletedAtIsNull(Long projectId);

    // Lấy issue theo key toàn cục (key duy nhất giữa các project còn sống)
    Optional<Issue> findByKeyAndDeletedAtIsNull(String key);

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
