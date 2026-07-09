package com.pmplatform.issue.service;

import com.pmplatform.issue.common.error.NotFoundException;
import com.pmplatform.issue.domain.ProjectProjection;
import com.pmplatform.issue.repository.ProjectProjectionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * KeyAllocator cấp key issue dạng "&lt;PROJECTKEY&gt;-&lt;n&gt;" (vd "PMV-1", "PMV-2")
 * theo từng project, đảm bảo NGUYÊN TỬ dưới đồng thời.
 *
 * <p>Bộ đếm nằm ở bảng {@code issue_key_seq(project_id, next_val)}. Ta dùng đúng 1 câu
 * SQL native: {@code INSERT ... ON CONFLICT DO UPDATE SET next_val = next_val + 1 RETURNING
 * next_val}. Postgres khoá dòng trong lúc UPSERT nên 2 request tạo issue song song sẽ nhận
 * 2 số khác nhau — không cần khoá bi quan hay retry ở tầng Java.
 *
 * <p>{@code next()} chạy trong transaction của caller (propagation REQUIRED): nếu tạo issue
 * sau đó thất bại, việc tăng bộ đếm cũng rollback theo → không để lại "lỗ" số.
 */
@Component
public class KeyAllocator {

    @PersistenceContext
    private EntityManager em;

    private final ProjectProjectionRepository projects;

    public KeyAllocator(ProjectProjectionRepository projects) {
        this.projects = projects;
    }

    /**
     * Cấp key kế tiếp cho project. Cần project đã có trong projects_projection
     * (được dựng từ workspace.events) để lấy prefix key.
     *
     * @throws NotFoundException nếu chưa có projection cho project (event chưa tới).
     */
    @Transactional
    public String next(long projectId) {
        ProjectProjection project = projects.findById(projectId)
                .orElseThrow(() -> new NotFoundException(
                        "project chưa có projection để cấp key: " + projectId));

        // UPSERT nguyên tử: lần đầu INSERT next_val=1; các lần sau tăng +1. RETURNING trả
        // về giá trị vừa ghi → chính là số thứ tự cho issue này.
        Object raw = em.createNativeQuery(
                        "INSERT INTO issue.issue_key_seq (project_id, next_val) VALUES (:pid, 1) "
                                + "ON CONFLICT (project_id) DO UPDATE "
                                + "SET next_val = issue.issue_key_seq.next_val + 1 "
                                + "RETURNING next_val")
                .setParameter("pid", projectId)
                .getSingleResult();

        long n = ((Number) raw).longValue();
        return project.getKey() + "-" + n;
    }
}
