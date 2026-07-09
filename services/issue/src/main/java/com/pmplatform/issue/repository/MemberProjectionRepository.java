package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.MemberProjection;
import com.pmplatform.issue.domain.MemberProjection.MemberProjectionId;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho members_projection (read-model Kafka) — nền tảng authz cục bộ.
 * Khoá ghép (workspace_id, user_id).
 */
public interface MemberProjectionRepository extends JpaRepository<MemberProjection, MemberProjectionId> {

    Optional<MemberProjection> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    boolean existsByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    List<MemberProjection> findByWorkspaceId(Long workspaceId);
}
