package com.pmplatform.issue.common.error;

/**
 * Sentinel: tài nguyên không tồn tại (issue/project/type/workflow...). → HTTP 404.
 * GlobalExceptionHandler (Phase I) map exception này sang response 404.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
