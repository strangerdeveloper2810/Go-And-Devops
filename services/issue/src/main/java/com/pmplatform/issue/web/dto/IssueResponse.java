package com.pmplatform.issue.web.dto;

import com.pmplatform.issue.domain.Issue;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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
                labels == null ? List.of() : List.of(labels),
                issue.getDueDate(),
                issue.getCreatedAt(),
                issue.getUpdatedAt());
    }
}
