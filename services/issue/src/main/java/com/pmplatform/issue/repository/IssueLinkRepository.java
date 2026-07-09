package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.IssueLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issue_links.
 */
public interface IssueLinkRepository extends JpaRepository<IssueLink, Long> {

    // Mọi link xuất phát từ issue
    List<IssueLink> findByFromIssueId(Long fromIssueId);

    // Mọi link trỏ tới issue
    List<IssueLink> findByToIssueId(Long toIssueId);

    // Mọi link liên quan tới issue (cả 2 chiều)
    List<IssueLink> findByFromIssueIdOrToIssueId(Long fromIssueId, Long toIssueId);

    boolean existsByFromIssueIdAndToIssueIdAndLinkType(Long fromIssueId, Long toIssueId, String linkType);
}
