package com.pmplatform.issue.common.error;

/**
 * Sentinel: user không phải thành viên workspace của project → cấm truy cập. → HTTP 403.
 * Authz cục bộ dựa trên members_projection (không gọi workspace-service trực tiếp).
 */
public class NotMemberException extends RuntimeException {

    public NotMemberException(String message) {
        super(message);
    }
}
