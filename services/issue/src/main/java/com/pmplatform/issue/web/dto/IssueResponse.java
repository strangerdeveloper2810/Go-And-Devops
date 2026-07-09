package com.pmplatform.issue.web.dto;

import com.pmplatform.issue.domain.Issue;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * View của một {@link Issue} trả về cho client (không lộ {@code deletedAt}). Dùng làm giá trị
 * trong wrapper {@code {"issue":{...}}} / {@code {"issues":[...]}}.
 */
public record IssueResponse(
        Long id,
        Long projectId,
        String key,
        Long typeId,
        String summary,
        String description,
        String status,
        String priority,
        Long assigneeId,
        Long reporterId,
        Long parentId,
        Long sprintId,
        BigDecimal storyPoints,
        List<String> labels,
        Instant dueDate,
        Instant createdAt,
        Instant updatedAt) {

    /** Map entity → response DTO. */
    public static IssueResponse from(Issue issue) {
        String[] labels = issue.getLabels();
        return new IssueResponse(
                issue.getId(),
                issue.getProjectId(),
                issue.getKey(),
                issue.getTypeId(),
                issue.getSummary(),
                issue.getDescription(),
                issue.getStatus(),
                issue.getPriority(),
                issue.getAssigneeId(),
                issue.getReporterId(),
                issue.getParentId(),
                issue.getSprintId(),
                issue.getStoryPoints(),
                // List.of(E...) là null-hostile → 1 phần tử null trong labels[] sẽ ném NPE
                // (issue đã persist + issue.created đã publish trước khi map response). Lọc null
                // để read (get/list/patch/transition) không kẹt 500 vĩnh viễn vì 1 row nhiễm null.
                labels == null ? List.of() : Arrays.stream(labels).filter(Objects::nonNull).toList(),
                issue.getDueDate(),
                issue.getCreatedAt(),
                issue.getUpdatedAt());
    }
}
