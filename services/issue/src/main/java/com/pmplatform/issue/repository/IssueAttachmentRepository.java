package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.IssueAttachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issue_attachments (metadata file).
 */
public interface IssueAttachmentRepository extends JpaRepository<IssueAttachment, Long> {

    List<IssueAttachment> findByIssueId(Long issueId);
}
