package com.pmplatform.issue.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Body cập nhật issue (partial): {@code PATCH /api/v1/issues/{key}}. Field null = KHÔNG đổi.
 * Đổi status KHÔNG đi qua đây mà qua endpoint transitions (ép đúng workflow).
 */
public record UpdateIssueRequest(
        @Size(max = 500, message = "summary tối đa 500 ký tự") String summary,
        String description,
        @Pattern(regexp = "highest|high|medium|low|lowest",
                message = "priority phải là highest|high|medium|low|lowest") String priority,
        Long assigneeId,
        List<String> labels) {
}
