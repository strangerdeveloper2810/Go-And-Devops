package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import org.hibernate.annotations.CreationTimestamp;

/**
 * watchers: user theo dõi issue. Khoá chính ghép (issue_id, user_id)
 * → 1 user chỉ watch 1 lần / issue.
 */
@Entity
@Table(name = "watchers", schema = "issue")
@IdClass(Watcher.WatcherId.class)
public class Watcher {

    @Id
    @Column(name = "issue_id")
    private Long issueId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getIssueId() {
        return issueId;
    }

    public void setIssueId(Long issueId) {
        this.issueId = issueId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    /** Composite PK cho watchers. */
    public static class WatcherId implements Serializable {

        private Long issueId;
        private Long userId;

        public WatcherId() {
        }

        public WatcherId(Long issueId, Long userId) {
            this.issueId = issueId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof WatcherId that)) {
                return false;
            }
            return Objects.equals(issueId, that.issueId) && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(issueId, userId);
        }
    }
}
