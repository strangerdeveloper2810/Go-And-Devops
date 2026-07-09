package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

/**
 * issue_links: quan hệ giữa 2 issue (blocks/relates/duplicates).
 * DB đã chặn tự-link + cặp trùng cùng loại (CHECK + UNIQUE).
 */
@Entity
@Table(name = "issue_links", schema = "issue")
public class IssueLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_issue_id", nullable = false)
    private Long fromIssueId;

    @Column(name = "to_issue_id", nullable = false)
    private Long toIssueId;

    // blocks | relates | duplicates (CHECK ở DB)
    @Column(name = "link_type", nullable = false, length = 20)
    private String linkType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getFromIssueId() {
        return fromIssueId;
    }

    public void setFromIssueId(Long fromIssueId) {
        this.fromIssueId = fromIssueId;
    }

    public Long getToIssueId() {
        return toIssueId;
    }

    public void setToIssueId(Long toIssueId) {
        this.toIssueId = toIssueId;
    }

    public String getLinkType() {
        return linkType;
    }

    public void setLinkType(String linkType) {
        this.linkType = linkType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
