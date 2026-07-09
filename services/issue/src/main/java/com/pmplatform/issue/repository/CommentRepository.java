package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho comments.
 */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByIssueIdOrderByCreatedAtAsc(Long issueId);
}
