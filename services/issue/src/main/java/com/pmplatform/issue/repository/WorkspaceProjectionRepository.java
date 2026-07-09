package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.WorkspaceProjection;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho workspaces_projection (read-model Kafka).
 */
public interface WorkspaceProjectionRepository extends JpaRepository<WorkspaceProjection, Long> {
}
