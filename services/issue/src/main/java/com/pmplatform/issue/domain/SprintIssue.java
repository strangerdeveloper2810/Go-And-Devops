package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * sprint_issues: bảng nối sprint <-> issue + position (thứ tự rank trong sprint).
 * Khoá chính ghép (sprint_id, issue_id).
 */
@Entity
@Table(name = "sprint_issues", schema = "issue")
@IdClass(SprintIssue.SprintIssueId.class)
public class SprintIssue {

    @Id
    @Column(name = "sprint_id")
    private Long sprintId;

    @Id
    @Column(name = "issue_id")
    private Long issueId;

    // thứ tự rank trong sprint (kéo-thả trên board)
    @Column(name = "position", nullable = false)
    private Long position = 0L;

    public Long getSprintId() {
        return sprintId;
    }

    public void setSprintId(Long sprintId) {
        this.sprintId = sprintId;
    }

    public Long getIssueId() {
        return issueId;
    }

    public void setIssueId(Long issueId) {
        this.issueId = issueId;
    }

    public Long getPosition() {
        return position;
    }

    public void setPosition(Long position) {
        this.position = position;
    }

    /** Composite PK cho sprint_issues. */
    public static class SprintIssueId implements Serializable {

        private Long sprintId;
        private Long issueId;

        public SprintIssueId() {
        }

        public SprintIssueId(Long sprintId, Long issueId) {
            this.sprintId = sprintId;
            this.issueId = issueId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof SprintIssueId that)) {
                return false;
            }
            return Objects.equals(sprintId, that.sprintId) && Objects.equals(issueId, that.issueId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(sprintId, issueId);
        }
    }
}
