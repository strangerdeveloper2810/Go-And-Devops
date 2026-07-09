package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.IssueType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issue_types. Query kết hợp system type (project_id NULL) + type riêng của project.
 */
public interface IssueTypeRepository extends JpaRepository<IssueType, Long> {

    // Type riêng của project HOẶC type hệ thống (project_id NULL)
    List<IssueType> findByProjectIdOrProjectIdIsNull(Long projectId);

    List<IssueType> findByProjectIdIsNull();

    Optional<IssueType> findByProjectIdAndKey(Long projectId, String key);

    boolean existsByProjectIdAndKey(Long projectId, String key);
}
