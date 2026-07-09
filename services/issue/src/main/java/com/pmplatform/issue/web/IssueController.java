package com.pmplatform.issue.web;

import com.pmplatform.issue.domain.Issue;
import com.pmplatform.issue.service.CreateIssueCommand;
import com.pmplatform.issue.service.IssueFilter;
import com.pmplatform.issue.service.IssueService;
import com.pmplatform.issue.service.UpdateIssueCommand;
import com.pmplatform.issue.web.dto.CreateIssueRequest;
import com.pmplatform.issue.web.dto.IssueResponse;
import com.pmplatform.issue.web.dto.TransitionRequest;
import com.pmplatform.issue.web.dto.UpdateIssueRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * IssueController — REST cho issue core (Jira). Danh tính caller ({@link CurrentUser}) do
 * {@link com.pmplatform.issue.web.filter.CurrentUserFilter} bơm từ header gateway; controller
 * chỉ map request DTO → command và entity → {@link IssueResponse}, mọi authz/nghiệp vụ nằm ở
 * {@link IssueService}. Lỗi sentinel được {@link GlobalExceptionHandler} map sang HTTP status.
 *
 * <p>Hai nhóm route: theo project ({@code /api/v1/projects/{projectId}/issues}) để tạo/list,
 * và theo key issue toàn cục ({@code /api/v1/issues/{key}}) cho get/update/transition/delete.
 */
@RestController
public class IssueController {

    private final IssueService issues;

    public IssueController(IssueService issues) {
        this.issues = issues;
    }

    // ── Project-scoped ────────────────────────────────────────────────────────

    /** Tạo issue trong project → 201 {@code {"issue":{...}}}. */
    @PostMapping("/api/v1/projects/{projectId}/issues")
    public ResponseEntity<Map<String, IssueResponse>> create(
            @PathVariable long projectId,
            @Valid @RequestBody CreateIssueRequest req,
            CurrentUser user) {

        CreateIssueCommand cmd = new CreateIssueCommand(
                projectId,
                req.typeId(),
                req.summary(),
                req.description(),
                req.priority(),
                req.assigneeId(),
                null, // parentId — set qua PATCH/subtask flow ở phase sau
                null, // sprintId
                null, // storyPoints
                toArray(req.labels()),
                null); // dueDate

        Issue created = issues.createIssue(user.userId(), cmd);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("issue", IssueResponse.from(created)));
    }

    /** List issue còn sống của project, lọc theo status/sprint → 200 {@code {"issues":[...]}}. */
    @GetMapping("/api/v1/projects/{projectId}/issues")
    public Map<String, List<IssueResponse>> listByProject(
            @PathVariable long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long sprintId,
            CurrentUser user) {

        IssueFilter filter = new IssueFilter(status, null, sprintId, null);
        List<IssueResponse> body = issues.listByProject(user.userId(), projectId, filter).stream()
                .map(IssueResponse::from)
                .toList();
        return Map.of("issues", body);
    }

    // ── Issue-key-scoped ──────────────────────────────────────────────────────

    /** Lấy 1 issue theo key → 200 {@code {"issue":{...}}}. */
    @GetMapping("/api/v1/issues/{key}")
    public Map<String, IssueResponse> getByKey(@PathVariable String key, CurrentUser user) {
        Issue issue = issues.getByKey(user.userId(), key);
        return Map.of("issue", IssueResponse.from(issue));
    }

    /** Cập nhật field (partial) → 200 {@code {"issue":{...}}}. */
    @PatchMapping("/api/v1/issues/{key}")
    public Map<String, IssueResponse> update(
            @PathVariable String key,
            @Valid @RequestBody UpdateIssueRequest req,
            CurrentUser user) {

        UpdateIssueCommand cmd = new UpdateIssueCommand(
                req.summary(),
                req.description(),
                req.priority(),
                req.assigneeId(),
                null, // parentId
                null, // sprintId
                null, // storyPoints
                toArray(req.labels()),
                null); // dueDate

        Issue updated = issues.updateIssue(user.userId(), key, cmd);
        return Map.of("issue", IssueResponse.from(updated));
    }

    /** Chuyển status theo workflow → 200 {@code {"issue":{...}}}; bước sai → 409. */
    @PostMapping("/api/v1/issues/{key}/transitions")
    public Map<String, IssueResponse> transition(
            @PathVariable String key,
            @Valid @RequestBody TransitionRequest req,
            CurrentUser user) {

        Issue transitioned = issues.transition(user.userId(), key, req.toStatus());
        return Map.of("issue", IssueResponse.from(transitioned));
    }

    /** Xoá mềm issue → 204. */
    @DeleteMapping("/api/v1/issues/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String key, CurrentUser user) {
        issues.deleteIssue(user.userId(), key);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static String[] toArray(List<String> labels) {
        return labels == null ? null : labels.toArray(new String[0]);
    }
}
