package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * users_projection: read-model dựng từ auth.user.events (Kafka).
 * Dùng để validate @mention và hiển thị assignee/reporter. id = auth user id nguồn.
 */
@Entity
@Table(name = "users_projection", schema = "issue")
public class UserProjection {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "email", nullable = false, length = 320)
    private String email = "";

    @Column(name = "name", nullable = false, length = 255)
    private String name = "";

    @Column(name = "avatar_url", nullable = false)
    private String avatarUrl = "";

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
