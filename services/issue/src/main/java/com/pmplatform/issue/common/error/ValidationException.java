package com.pmplatform.issue.common.error;

/**
 * Sentinel: dữ liệu đầu vào không hợp lệ về mặt nghiệp vụ (vd issue type không thuộc
 * project, priority sai...). → HTTP 400.
 */
public class ValidationException extends RuntimeException {

    public ValidationException(String message) {
        super(message);
    }
}
