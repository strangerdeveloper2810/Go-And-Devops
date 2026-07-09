package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Watcher;
import com.pmplatform.issue.domain.Watcher.WatcherId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho watchers (khoá ghép issue_id + user_id).
 */
public interface WatcherRepository extends JpaRepository<Watcher, WatcherId> {

    List<Watcher> findByIssueId(Long issueId);

    List<Watcher> findByUserId(Long userId);

    boolean existsByIssueIdAndUserId(Long issueId, Long userId);

    void deleteByIssueIdAndUserId(Long issueId, Long userId);
}
