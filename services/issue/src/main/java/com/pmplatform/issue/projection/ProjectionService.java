package com.pmplatform.issue.projection;

import com.pmplatform.issue.domain.MemberProjection;
import com.pmplatform.issue.domain.MemberProjection.MemberProjectionId;
import com.pmplatform.issue.domain.ProjectProjection;
import com.pmplatform.issue.domain.UserProjection;
import com.pmplatform.issue.domain.WorkspaceProjection;
import com.pmplatform.issue.repository.MemberProjectionRepository;
import com.pmplatform.issue.repository.ProjectProjectionRepository;
import com.pmplatform.issue.repository.UserProjectionRepository;
import com.pmplatform.issue.repository.WorkspaceProjectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ProjectionService gom toàn bộ upsert cho các read-model (workspaces/projects/
 * members/users) dựng từ Kafka. Đây là NỀN TẢNG AUTHZ cục bộ: issue-service không
 * bao giờ query trực tiếp workspace-service, mà tự authorize dựa trên các bảng này.
 *
 * <p>Mọi hàm đều IDEMPOTENT (save-or-update): id được gán trực tiếp = id nguồn nên
 * {@code save()} tự chọn INSERT hay UPDATE (merge). Nhờ vậy Kafka giao lại message
 * (at-least-once) vẫn an toàn — chạy lại chỉ ghi đè cùng dữ liệu, không nhân bản.
 *
 * <p>Mỗi hàm chạy trong 1 transaction: khi hàm return là DB đã commit, consumer mới
 * ack → offset chỉ tiến sau khi ghi DB thành công.
 */
@Service
public class ProjectionService {

    private final WorkspaceProjectionRepository workspaces;
    private final ProjectProjectionRepository projects;
    private final MemberProjectionRepository members;
    private final UserProjectionRepository users;

    public ProjectionService(WorkspaceProjectionRepository workspaces,
                             ProjectProjectionRepository projects,
                             MemberProjectionRepository members,
                             UserProjectionRepository users) {
        this.workspaces = workspaces;
        this.projects = projects;
        this.members = members;
        this.users = users;
    }

    /** Upsert workspaces_projection từ workspace.created. */
    @Transactional
    public void upsertWorkspace(long id, String slug, String name) {
        WorkspaceProjection w = workspaces.findById(id).orElseGet(WorkspaceProjection::new);
        w.setId(id);
        w.setSlug(slug);
        w.setName(name);
        workspaces.save(w);
    }

    /** Upsert projects_projection từ project.created — nguồn map project -> workspace + key. */
    @Transactional
    public void upsertProject(long id, long workspaceId, String key, String name) {
        ProjectProjection p = projects.findById(id).orElseGet(ProjectProjection::new);
        p.setId(id);
        p.setWorkspaceId(workspaceId);
        p.setKey(key);
        p.setName(name);
        projects.save(p);
    }

    /** Upsert members_projection từ member.added — nền tảng authz (role owner/member). */
    @Transactional
    public void upsertMember(long workspaceId, long userId, String role) {
        MemberProjection m = members.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseGet(MemberProjection::new);
        m.setWorkspaceId(workspaceId);
        m.setUserId(userId);
        m.setRole(role);
        members.save(m);
    }

    /**
     * Xoá members_projection từ member.removed. Idempotent: nếu đã xoá rồi (message
     * giao lại) thì bỏ qua, không ném lỗi.
     */
    @Transactional
    public void removeMember(long workspaceId, long userId) {
        if (members.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            members.deleteById(new MemberProjectionId(workspaceId, userId));
        }
    }

    /** Upsert users_projection từ auth.user.events (UserCreated) — validate @mention, hiển thị user. */
    @Transactional
    public void upsertUser(long id, String email, String name, String avatarUrl) {
        UserProjection u = users.findById(id).orElseGet(UserProjection::new);
        u.setId(id);
        u.setEmail(email);
        u.setName(name);
        u.setAvatarUrl(avatarUrl);
        users.save(u);
    }
}
