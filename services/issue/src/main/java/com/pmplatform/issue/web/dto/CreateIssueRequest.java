package com.pmplatform.issue.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Body tạo issue: {@code POST /api/v1/projects/{projectId}/issues}. projectId lấy từ path
 * (không nằm trong body); reporterId = caller (X-User-ID), không nhận từ client.
 *
 * @param typeId      id issue type (bắt buộc) — phải hợp lệ cho project (validate ở service).
 * @param summary     tiêu đề ngắn (bắt buộc).
 * @param description mô tả chi tiết (tuỳ chọn — null → rỗng).
 * @param priority    highest|high|medium|low|lowest (tuỳ chọn — null → medium).
 * @param assigneeId  người được giao (tuỳ chọn).
 * @param labels      danh sách nhãn tự do (tuỳ chọn).
 */
public record CreateIssueRequest(
        @NotNull(message = "typeId là bắt buộc") Long typeId,
        @NotBlank(message = "summary là bắt buộc")
        @Size(max = 500, message = "summary tối đa 500 ký tự") String summary,
        String description,
        @Pattern(regexp = "highest|high|medium|low|lowest",
                message = "priority phải là highest|high|medium|low|lowest") String priority,
        Long assigneeId,
        List<String> labels) {
}
