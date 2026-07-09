package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * projects_projection: read-model dựng từ workspace.events (Kafka).
 * Dùng để resolve project -> workspace (authz) và lấy key dựng issue key.
 * id gán trực tiếp = project id nguồn (không sinh tự động).
 */
@Entity
@Table(name = "projects_projection", schema = "issue")
public class ProjectProjection {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    // dùng để dựng issue key "<KEY>-<n>"
    @Column(name = "key", nullable = false, length = 20)
    private String key = "";

    @Column(name = "name", nullable = false, length = 255)
    private String name = "";

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(Long workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
