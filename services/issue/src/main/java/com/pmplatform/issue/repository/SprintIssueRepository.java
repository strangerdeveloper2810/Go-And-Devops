package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.SprintIssue;
import com.pmplatform.issue.domain.SprintIssue.SprintIssueId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho sprint_issues (khoá ghép sprint_id + issue_id), có position để rank.
 */
public interface SprintIssueRepository extends JpaRepository<SprintIssue, SprintIssueId> {

    List<SprintIssue> findBySprintIdOrderByPositionAsc(Long sprintId);

    List<SprintIssue> findByIssueId(Long issueId);

    void deleteBySprintIdAndIssueId(Long sprintId, Long issueId);
}
