package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * issue_key_seq: bộ đếm key per-project để cấp "<KEY>-<n>" nguyên tử.
 * project_id là khoá chính (gán trực tiếp, không sinh tự động).
 */
@Entity
@Table(name = "issue_key_seq", schema = "issue")
public class IssueKeySeq {

    @Id
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "next_val", nullable = false)
    private Long nextVal = 1L;

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getNextVal() {
        return nextVal;
    }

    public void setNextVal(Long nextVal) {
        this.nextVal = nextVal;
    }
}
