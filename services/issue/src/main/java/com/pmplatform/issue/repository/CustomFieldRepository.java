package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.CustomField;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho custom_fields (system + per-project).
 */
public interface CustomFieldRepository extends JpaRepository<CustomField, Long> {

    List<CustomField> findByProjectIdOrProjectIdIsNull(Long projectId);

    Optional<CustomField> findByProjectIdAndKey(Long projectId, String key);

    boolean existsByProjectIdAndKey(Long projectId, String key);
}
