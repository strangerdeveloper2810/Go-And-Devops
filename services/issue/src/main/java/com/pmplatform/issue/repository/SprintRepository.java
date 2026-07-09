package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Sprint;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho sprints.
 */
public interface SprintRepository extends JpaRepository<Sprint, Long> {

    List<Sprint> findByProjectId(Long projectId);

    List<Sprint> findByProjectIdAndState(Long projectId, String state);
}
