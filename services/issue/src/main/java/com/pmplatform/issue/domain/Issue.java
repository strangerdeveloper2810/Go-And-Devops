package com.pmplatform.issue.domain;

import io.hypersistence.utils.hibernate.type.array.StringArrayType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * issues: bảng trung tâm — 1 đơn vị công việc. key duy nhất trong project (vd "PMV-1").
 * project_id/assignee_id/reporter_id KHÔNG FK: trỏ sang dữ liệu service khác
 * (chỉ có projection cục bộ, có thể trễ) → tránh chặn write vì projection chưa tới.
 * Soft delete bằng deleted_at (NULL = còn sống).
 */
@Entity
@Table(name = "issues", schema = "issue")
public class Issue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    // "<PROJECTKEY>-<n>" — duy nhất trong project (partial unique WHERE deleted_at IS NULL)
    @Column(name = "key", nullable = false, length = 64)
    private String key;

    @Column(name = "type_id", nullable = false)
    private Long typeId;

    @Column(name = "summary", nullable = false, length = 500)
    private String summary;

    @Column(name = "description", nullable = false)
    private String description = "";

    // 1 trong workflow.states (không FK cứng vào workflow)
    @Column(name = "status", nullable = false, length = 64)
    private String status = "To Do";

    // highest | high | medium | low | lowest (CHECK ở DB)
    @Column(name = "priority", nullable = false, length = 20)
    private String priority = "medium";

    @Column(name = "assignee_id")
    private Long assigneeId;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    // self ref: subtask trỏ tới issue cha
    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "sprint_id")
    private Long sprintId;

    // điểm ước lượng (nullable) — NUMERIC(6,2)
    @Column(name = "story_points")
    private BigDecimal storyPoints;

    // mảng nhãn tự do — Postgres text[]
    @Type(StringArrayType.class)
    @Column(name = "labels", nullable = false, columnDefinition = "text[]")
    private String[] labels;

    @Column(name = "due_date")
    private Instant dueDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // NULL = chưa xoá; set thời điểm xoá mềm
    @Column(name = "deleted_at")
    private Instant deletedAt;

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

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public Long getTypeId() {
        return typeId;
    }

    public void setTypeId(Long typeId) {
        this.typeId = typeId;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(Long assigneeId) {
        this.assigneeId = assigneeId;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public void setReporterId(Long reporterId) {
        this.reporterId = reporterId;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public Long getSprintId() {
        return sprintId;
    }

    public void setSprintId(Long sprintId) {
        this.sprintId = sprintId;
    }

    public BigDecimal getStoryPoints() {
        return storyPoints;
    }

    public void setStoryPoints(BigDecimal storyPoints) {
        this.storyPoints = storyPoints;
    }

    public String[] getLabels() {
        return labels;
    }

    public void setLabels(String[] labels) {
        this.labels = labels;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public void setDueDate(Instant dueDate) {
        this.dueDate = dueDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
