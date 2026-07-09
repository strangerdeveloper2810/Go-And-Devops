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
 * workflows: quy trình trạng thái của issue. states/transitions lưu JSONB
 * (không FK cứng vào cột status của issues → cho phép workflow tuỳ biến).
 * project_id NULL = workflow mặc định hệ thống.
 */
@Entity
@Table(name = "workflows", schema = "issue")
public class Workflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    // vd ["To Do","In Progress","In Review","Done"]
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "states", nullable = false)
    private JsonNode states;

    // vd [{"from":"To Do","to":"In Progress","name":"Start"}]
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "transitions", nullable = false)
    private JsonNode transitions;

    @Column(name = "is_default", nullable = false)
    private boolean defaultWorkflow = false;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public JsonNode getStates() {
        return states;
    }

    public void setStates(JsonNode states) {
        this.states = states;
    }

    public JsonNode getTransitions() {
        return transitions;
    }

    public void setTransitions(JsonNode transitions) {
        this.transitions = transitions;
    }

    public boolean isDefaultWorkflow() {
        return defaultWorkflow;
    }

    public void setDefaultWorkflow(boolean defaultWorkflow) {
        this.defaultWorkflow = defaultWorkflow;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
