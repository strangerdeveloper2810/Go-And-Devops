package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.FieldScreen;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho field_screens (field layout theo issue type).
 */
public interface FieldScreenRepository extends JpaRepository<FieldScreen, Long> {

    List<FieldScreen> findByProjectIdOrProjectIdIsNull(Long projectId);

    Optional<FieldScreen> findByIssueTypeId(Long issueTypeId);
}
