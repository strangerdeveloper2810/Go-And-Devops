package com.pmplatform.issue.common.error;

/**
 * Sentinel: thao tác yêu cầu quyền owner/admin (vd sửa type/workflow) nhưng caller
 * chỉ là member thường. → HTTP 403.
 */
public class NotOwnerException extends RuntimeException {

    public NotOwnerException(String message) {
        super(message);
    }
}
