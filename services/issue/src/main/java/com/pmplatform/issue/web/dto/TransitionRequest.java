package com.pmplatform.issue.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body chuyển trạng thái: {@code POST /api/v1/issues/{key}/transitions} với {@code {"toStatus":"..."}}.
 * Bước chuyển phải nằm trong transitions hợp lệ của workflow, nếu không → 409 (ở service).
 */
public record TransitionRequest(
        @NotBlank(message = "toStatus là bắt buộc") String toStatus) {
}
