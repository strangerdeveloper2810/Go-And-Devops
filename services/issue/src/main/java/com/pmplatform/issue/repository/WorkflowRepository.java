package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Workflow;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho workflows (system + per-project).
 */
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {

    List<Workflow> findByProjectIdOrProjectIdIsNull(Long projectId);

    // Workflow mặc định hệ thống (project_id NULL, is_default = true)
    Optional<Workflow> findFirstByProjectIdIsNullAndDefaultWorkflowIsTrue();
}
