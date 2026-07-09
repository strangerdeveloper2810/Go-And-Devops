package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.UserProjection;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho users_projection (read-model Kafka) — validate @mention, hiển thị user.
 */
public interface UserProjectionRepository extends JpaRepository<UserProjection, Long> {
}
