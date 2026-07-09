package com.pmplatform.issue.service;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Tham số cập nhật issue — mọi field nullable: null = KHÔNG đổi field đó (partial update).
 * Đổi status KHÔNG đi qua đây mà qua {@code transition()} để ép đúng workflow.
 */
public record UpdateIssueCommand(
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
