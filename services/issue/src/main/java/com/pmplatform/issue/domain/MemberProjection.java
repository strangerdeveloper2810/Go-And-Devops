package com.pmplatform.issue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * members_projection: read-model membership dựng từ workspace.events (Kafka).
 * Nền tảng authz cục bộ (role owner/member). Khoá chính ghép (workspace_id, user_id).
 */
@Entity
@Table(name = "members_projection", schema = "issue")
@IdClass(MemberProjection.MemberProjectionId.class)
public class MemberProjection {

    @Id
    @Column(name = "workspace_id")
    private Long workspaceId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    // 'owner' / 'member' — dùng cho authz cục bộ
    @Column(name = "role", nullable = false, length = 64)
    private String role = "";

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(Long workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    /** Composite PK cho members_projection. */
    public static class MemberProjectionId implements Serializable {

        private Long workspaceId;
        private Long userId;

        public MemberProjectionId() {
        }

        public MemberProjectionId(Long workspaceId, Long userId) {
            this.workspaceId = workspaceId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof MemberProjectionId that)) {
                return false;
            }
            return Objects.equals(workspaceId, that.workspaceId) && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(workspaceId, userId);
        }
    }
}
