package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.ProjectProjection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho projects_projection (read-model Kafka).
 * findById (kế thừa) dùng để resolve project -> workspace khi authz.
 */
public interface ProjectProjectionRepository extends JpaRepository<ProjectProjection, Long> {

    List<ProjectProjection> findByWorkspaceId(Long workspaceId);
}
