package com.pmplatform.issue.common.error;

/**
 * Sentinel: xung đột trạng thái — vd chuyển status không nằm trong transition hợp lệ
 * của workflow, hoặc vi phạm ràng buộc duy nhất. → HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
