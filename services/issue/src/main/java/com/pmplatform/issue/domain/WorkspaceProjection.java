package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * workspaces_projection: read-model dựng từ workspace.events (Kafka).
 * KHÔNG phải nguồn dữ liệu; id gán trực tiếp = workspace id nguồn (không sinh tự động).
 */
@Entity
@Table(name = "workspaces_projection", schema = "issue")
public class WorkspaceProjection {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "slug", nullable = false, length = 255)
    private String slug = "";

    @Column(name = "name", nullable = false, length = 255)
    private String name = "";

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
