package com.pmplatform.issue.service;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Tham số tạo issue (không gồm actorId — identity lấy từ header X-User-ID ở tầng web,
 * truyền riêng vào service). Các field nullable là tuỳ chọn; service tự điền mặc định
 * (priority=medium, status = state đầu của workflow, labels rỗng...).
 */
public record CreateIssueCommand(
        long projectId,
        long typeId,
        String summary,
        String description,
        String priority,
        Long assigneeId,
        Long parentId,
        Long sprintId,
        BigDecimal storyPoints,
        String[] labels,
        Instant dueDate) {
}
