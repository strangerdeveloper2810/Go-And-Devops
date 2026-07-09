package com.pmplatform.issue.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pmplatform.issue.common.error.ConflictException;
import com.pmplatform.issue.common.error.NotFoundException;
import com.pmplatform.issue.common.error.NotMemberException;
import com.pmplatform.issue.common.error.ValidationException;
import com.pmplatform.issue.domain.Issue;
import com.pmplatform.issue.domain.IssueType;
import com.pmplatform.issue.domain.ProjectProjection;
import com.pmplatform.issue.domain.Workflow;
import com.pmplatform.issue.event.IssueEventPublisher;
import com.pmplatform.issue.repository.IssueRepository;
import com.pmplatform.issue.repository.IssueTypeRepository;
import com.pmplatform.issue.repository.MemberProjectionRepository;
import com.pmplatform.issue.repository.ProjectProjectionRepository;
import com.pmplatform.issue.repository.WorkflowRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * IssueService — nghiệp vụ lõi của issue-service (Jira core): tạo/đọc/sửa/xoá issue và
 * chuyển trạng thái theo workflow.
 *
 * <p>AUTHZ CỤC BỘ: mọi thao tác đều yêu cầu caller (actorId, lấy từ header X-User-ID) là
 * thành viên workspace chứa project — kiểm qua {@code projects_projection} +
 * {@code members_projection} (read-model Kafka), KHÔNG gọi workspace-service trực tiếp.
 *
 * <p>project_id/type/workflow đều là ref "mềm": issue chỉ lưu id, không FK cứng sang dữ liệu
 * service khác → tránh chặn write khi projection tới trễ.
 */
@Service
public class IssueService {

    private final IssueRepository issues;
    private final IssueTypeRepository issueTypes;
    private final WorkflowRepository workflows;
    private final ProjectProjectionRepository projects;
    private final MemberProjectionRepository members;
    private final KeyAllocator keyAllocator;
    private final IssueEventPublisher publisher;

    public IssueService(
            IssueRepository issues,
            IssueTypeRepository issueTypes,
            WorkflowRepository workflows,
            ProjectProjectionRepository projects,
            MemberProjectionRepository members,
            KeyAllocator keyAllocator,
            IssueEventPublisher publisher) {
        this.issues = issues;
        this.issueTypes = issueTypes;
        this.workflows = workflows;
        this.projects = projects;
        this.members = members;
        this.keyAllocator = keyAllocator;
        this.publisher = publisher;
    }

    // ── Commands ────────────────────────────────────────────────────────────

    /**
     * Tạo issue mới: validate project + membership + type, đặt status = state đầu của
     * workflow mặc định, cấp key nguyên tử, lưu, rồi phát issue.created.
     */
    @Transactional
    public Issue createIssue(long actorId, CreateIssueCommand cmd) {
        long workspaceId = assertProjectMember(actorId, cmd.projectId());

        // assignee (nếu có) phải là thành viên workspace của issue — không cho gán cho người
        // ngoài workspace hay user không tồn tại (giữ toàn vẹn dữ liệu assignee_id).
        assertAssigneeMember(workspaceId, cmd.assigneeId());

        // type phải tồn tại và dùng được cho project này: hoặc system (project_id NULL)
        // hoặc thuộc đúng project.
        IssueType type = issueTypes.findById(cmd.typeId())
                .filter(t -> t.getProjectId() == null || t.getProjectId().equals(cmd.projectId()))
                .orElseThrow(() -> new ValidationException(
                        "issue type không hợp lệ cho project: " + cmd.typeId()));

        // status khởi tạo = state đầu tiên của workflow mặc định.
        Workflow workflow = resolveDefaultWorkflow(cmd.projectId());
        String initialStatus = firstState(workflow);

        String key = keyAllocator.next(cmd.projectId());

        Issue issue = new Issue();
        issue.setProjectId(cmd.projectId());
        issue.setKey(key);
        issue.setTypeId(type.getId());
        issue.setSummary(cmd.summary());
        issue.setDescription(cmd.description() == null ? "" : cmd.description());
        issue.setStatus(initialStatus);
        issue.setPriority(cmd.priority() == null ? "medium" : cmd.priority());
        issue.setAssigneeId(cmd.assigneeId());
        issue.setReporterId(actorId);
        issue.setParentId(cmd.parentId());
        issue.setSprintId(cmd.sprintId());
        issue.setStoryPoints(cmd.storyPoints());
        issue.setLabels(cmd.labels() == null ? new String[0] : cmd.labels());
        issue.setDueDate(cmd.dueDate());

        Issue saved = issues.save(issue);
        publishAfterCommit(() -> publisher.publishIssueCreated(workspaceId, actorId, saved));
        return saved;
    }

    /**
     * Cập nhật field của issue (partial: chỉ field non-null trong cmd). Đổi status KHÔNG
     * qua đây mà qua {@link #transition}. Phát issue.updated nếu có gì thực sự thay đổi.
     */
    @Transactional
    public Issue updateIssue(long actorId, String key, UpdateIssueCommand cmd) {
        Issue issue = getExistingByKey(key);
        long workspaceId = assertProjectMember(actorId, issue.getProjectId());

        List<String> changed = new ArrayList<>();
        if (cmd.summary() != null) {
            issue.setSummary(cmd.summary());
            changed.add("summary");
        }
        if (cmd.description() != null) {
            issue.setDescription(cmd.description());
            changed.add("description");
        }
        if (cmd.priority() != null) {
            issue.setPriority(cmd.priority());
            changed.add("priority");
        }
        if (cmd.assigneeId() != null) {
            // assignee mới phải là thành viên workspace của issue (chặn gán cho người ngoài).
            assertAssigneeMember(workspaceId, cmd.assigneeId());
            issue.setAssigneeId(cmd.assigneeId());
            changed.add("assignee_id");
        }
        if (cmd.parentId() != null) {
            issue.setParentId(cmd.parentId());
            changed.add("parent_id");
        }
        if (cmd.sprintId() != null) {
            issue.setSprintId(cmd.sprintId());
            changed.add("sprint_id");
        }
        if (cmd.storyPoints() != null) {
            issue.setStoryPoints(cmd.storyPoints());
            changed.add("story_points");
        }
        if (cmd.labels() != null) {
            issue.setLabels(cmd.labels());
            changed.add("labels");
        }
        if (cmd.dueDate() != null) {
            issue.setDueDate(cmd.dueDate());
            changed.add("due_date");
        }

        if (changed.isEmpty()) {
            return issue; // không có gì đổi → khỏi lưu/phát event
        }

        Issue saved = issues.save(issue);
        publishAfterCommit(() -> publisher.publishIssueUpdated(workspaceId, actorId, saved, changed));
        return saved;
    }

    /**
     * Chuyển status theo workflow: CHỈ cho phép nếu (from → to) nằm trong transitions của
     * workflow. Bước không hợp lệ ném {@link ConflictException} (→ 409).
     */
    @Transactional
    public Issue transition(long actorId, String key, String toStatus) {
        Issue issue = getExistingByKey(key);
        long workspaceId = assertProjectMember(actorId, issue.getProjectId());

        String fromStatus = issue.getStatus();
        Workflow workflow = resolveDefaultWorkflow(issue.getProjectId());
        if (!isTransitionAllowed(workflow, fromStatus, toStatus)) {
            throw new ConflictException(
                    "chuyển trạng thái không hợp lệ: " + fromStatus + " → " + toStatus);
        }

        issue.setStatus(toStatus);
        Issue saved = issues.save(issue);
        publishAfterCommit(
                () -> publisher.publishIssueTransitioned(workspaceId, actorId, saved, fromStatus, toStatus));
        return saved;
    }

    /** Xoá mềm issue (set deleted_at). Không phát event (Phase F giữ tối giản). */
    @Transactional
    public void deleteIssue(long actorId, String key) {
        Issue issue = getExistingByKey(key);
        assertProjectMember(actorId, issue.getProjectId());
        issue.setDeletedAt(Instant.now());
        issues.save(issue);
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    /** Lấy 1 issue theo key toàn cục; caller phải là thành viên workspace của project. */
    @Transactional(readOnly = true)
    public Issue getByKey(long actorId, String key) {
        Issue issue = getExistingByKey(key);
        assertProjectMember(actorId, issue.getProjectId());
        return issue;
    }

    /**
     * List issue còn sống của project, áp bộ lọc (status/assignee/sprint/labels). Lọc trong
     * bộ nhớ cho gọn ở phase này; sau có thể thay bằng query động nếu dữ liệu lớn.
     */
    @Transactional(readOnly = true)
    public List<Issue> listByProject(long actorId, long projectId, IssueFilter filter) {
        assertProjectMember(actorId, projectId);
        IssueFilter f = filter == null ? IssueFilter.none() : filter;

        return issues.findByProjectIdAndDeletedAtIsNull(projectId).stream()
                .filter(i -> f.status() == null || f.status().equals(i.getStatus()))
                .filter(i -> f.assigneeId() == null || f.assigneeId().equals(i.getAssigneeId()))
                .filter(i -> f.sprintId() == null || f.sprintId().equals(i.getSprintId()))
                .filter(i -> f.labels() == null || f.labels().isEmpty() || hasAllLabels(i, f.labels()))
                .toList();
    }

    // ── Authz helper ──────────────────────────────────────────────────────────

    /**
     * Xác nhận caller là thành viên workspace chứa project. Resolve project → workspace qua
     * projects_projection, membership qua members_projection.
     *
     * @return workspace_id của project (dùng làm partition key khi phát event).
     * @throws NotFoundException  project chưa có projection (event chưa tới) → 404.
     * @throws NotMemberException caller không thuộc workspace → 403.
     */
    public long assertProjectMember(long actorId, long projectId) {
        ProjectProjection project = projects.findById(projectId)
                .orElseThrow(() -> new NotFoundException(
                        "project không tồn tại (chưa có projection): " + projectId));

        long workspaceId = project.getWorkspaceId();
        if (!members.existsByWorkspaceIdAndUserId(workspaceId, actorId)) {
            throw new NotMemberException(
                    "user " + actorId + " không phải thành viên workspace " + workspaceId);
        }
        return workspaceId;
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    private Issue getExistingByKey(String key) {
        return issues.findByKeyAndDeletedAtIsNull(key)
                .orElseThrow(() -> new NotFoundException("issue không tồn tại: " + key));
    }

    // assignee phải thuộc workspace của issue. null = không gán (bỏ qua). Không hợp lệ → 400.
    private void assertAssigneeMember(long workspaceId, Long assigneeId) {
        if (assigneeId != null && !members.existsByWorkspaceIdAndUserId(workspaceId, assigneeId)) {
            throw new ValidationException(
                    "assignee không phải thành viên workspace: " + assigneeId);
        }
    }

    // Chạy publish CHỈ SAU khi transaction commit thành công: nếu commit rollback (vd mất
    // kết nối lúc commit) thì KHÔNG phát event → tránh event "ma" cho state chưa từng tồn tại.
    // Ngoài transaction (không nên xảy ra ở các @Transactional command) thì chạy ngay.
    private void publishAfterCommit(Runnable publish) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }
    }

    // Workflow áp dụng cho project: ưu tiên workflow mặc định RIÊNG của project, nếu không có
    // thì dùng workflow mặc định hệ thống (seed ở V2).
    private Workflow resolveDefaultWorkflow(long projectId) {
        return workflows.findByProjectIdOrProjectIdIsNull(projectId).stream()
                .filter(Workflow::isDefaultWorkflow)
                .filter(w -> w.getProjectId() != null)
                .findFirst()
                .or(workflows::findFirstByProjectIdIsNullAndDefaultWorkflowIsTrue)
                .orElseThrow(() -> new NotFoundException(
                        "không tìm thấy default workflow cho project: " + projectId));
    }

    // state đầu tiên trong workflow.states (JSON array). Fallback "To Do" nếu rỗng.
    private String firstState(Workflow workflow) {
        JsonNode states = workflow.getStates();
        if (states != null && states.isArray() && !states.isEmpty()) {
            return states.get(0).asText();
        }
        return "To Do";
    }

    // (from → to) có nằm trong transitions của workflow không? transitions = JSON array các
    // object {"from","to","name"}.
    private boolean isTransitionAllowed(Workflow workflow, String from, String to) {
        JsonNode transitions = workflow.getTransitions();
        if (transitions == null || !transitions.isArray()) {
            return false;
        }
        for (JsonNode t : transitions) {
            if (from.equals(t.path("from").asText()) && to.equals(t.path("to").asText())) {
                return true;
            }
        }
        return false;
    }

    // Issue có chứa TẤT CẢ nhãn yêu cầu không?
    private boolean hasAllLabels(Issue issue, List<String> required) {
        String[] labels = issue.getLabels();
        if (labels == null) {
            return false;
        }
        Set<String> have = Set.copyOf(Arrays.asList(labels));
        return have.containsAll(required);
    }
}
