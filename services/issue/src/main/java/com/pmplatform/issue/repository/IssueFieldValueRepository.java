package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.IssueFieldValue;
import com.pmplatform.issue.domain.IssueFieldValue.IssueFieldValueId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issue_field_values (khoá ghép issue_id + field_id).
 */
public interface IssueFieldValueRepository extends JpaRepository<IssueFieldValue, IssueFieldValueId> {

    List<IssueFieldValue> findByIssueId(Long issueId);

    void deleteByIssueId(Long issueId);
}
