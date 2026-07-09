package com.pmplatform.issue.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * field_screens: field nào hiển thị cho từng issue_type (layout lưu JSONB).
 * project_id NULL = screen mặc định hệ thống.
 */
@Entity
@Table(name = "field_screens", schema = "issue")
public class FieldScreen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "issue_type_id", nullable = false)
    private Long issueTypeId;

    // thứ tự + nhóm field trên form (vd [{"section":..,"fields":[...]}])
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "field_layout", nullable = false)
    private JsonNode fieldLayout;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getIssueTypeId() {
        return issueTypeId;
    }

    public void setIssueTypeId(Long issueTypeId) {
        this.issueTypeId = issueTypeId;
    }

    public JsonNode getFieldLayout() {
        return fieldLayout;
    }

    public void setFieldLayout(JsonNode fieldLayout) {
        this.fieldLayout = fieldLayout;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
