package com.pmplatform.issue.web;

import com.pmplatform.issue.common.error.ConflictException;
import com.pmplatform.issue.common.error.NotFoundException;
import com.pmplatform.issue.common.error.NotMemberException;
import com.pmplatform.issue.common.error.NotOwnerException;
import com.pmplatform.issue.common.error.ValidationException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * GlobalExceptionHandler map các sentinel exception nghiệp vụ (Phase F) + lỗi validation của
 * Spring sang HTTP status và body {@link ApiError} (giống {@code respondErr} của workspace).
 *
 * <ul>
 *   <li>{@link ValidationException} / lỗi bean-validation / body sai định dạng → 400</li>
 *   <li>{@link NotMemberException} / {@link NotOwnerException} → 403</li>
 *   <li>{@link NotFoundException} / route không khớp → 404</li>
 *   <li>{@link ConflictException} → 409</li>
 *   <li>lỗi dispatch Spring MVC → 405 / 406 / 415</li>
 *   <li>còn lại → 500 INTERNAL (log stacktrace)</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── 400 — dữ liệu đầu vào ────────────────────────────────────────────────

    /** Vi phạm nghiệp vụ (vd issue type không thuộc project). */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiError> handleValidation(ValidationException ex) {
        return body(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", ex.getMessage());
    }

    /** @Valid trên request DTO thất bại → gộp field errors thành 1 message. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleBeanValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::formatFieldError)
                .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "request không hợp lệ";
        }
        return body(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    /** Body JSON thiếu/sai cú pháp. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        return body(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "request body không hợp lệ hoặc rỗng");
    }

    /** Path/query param sai kiểu (vd projectId không phải số). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return body(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "tham số không hợp lệ: " + ex.getName());
    }

    // ── 403 / 404 / 409 — sentinel nghiệp vụ ─────────────────────────────────

    @ExceptionHandler(NotMemberException.class)
    public ResponseEntity<ApiError> handleNotMember(NotMemberException ex) {
        return body(HttpStatus.FORBIDDEN, "NOT_MEMBER", ex.getMessage());
    }

    @ExceptionHandler(NotOwnerException.class)
    public ResponseEntity<ApiError> handleNotOwner(NotOwnerException ex) {
        return body(HttpStatus.FORBIDDEN, "NOT_OWNER", ex.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex) {
        return body(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage());
    }

    /** Ghi đè đồng thời (optimistic lock @Version) → 409 để client thử lại,
     *  thay vì âm thầm mất update của một trong hai request. */
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleOptimisticLock(
            org.springframework.orm.ObjectOptimisticLockingFailureException ex) {
        return body(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION",
                "issue đã bị thay đổi bởi request khác, vui lòng tải lại và thử lại");
    }

    // ── 404 / 405 / 406 / 415 — dispatch lỗi của Spring MVC ──────────────────
    // Phải khai báo tường minh: @ExceptionHandler(Exception.class) là super-type match
    // nên ExceptionHandlerExceptionResolver (chạy trước DefaultHandlerExceptionResolver)
    // sẽ "nuốt" các lỗi client này thành 500 nếu không có handler cụ thể.

    /** HTTP method không được route hỗ trợ (vd POST vào endpoint chỉ có GET). */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return body(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", ex.getMessage());
    }

    /** Content-Type của request body không được hỗ trợ (vd không phải application/json). */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return body(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", ex.getMessage());
    }

    /** Accept header client yêu cầu không thể đáp ứng. */
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ApiError> handleMediaTypeNotAcceptable(HttpMediaTypeNotAcceptableException ex) {
        return body(HttpStatus.NOT_ACCEPTABLE, "NOT_ACCEPTABLE", ex.getMessage());
    }

    /** Không có route/resource nào khớp path → 404 (thay vì 500). */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", "không tìm thấy resource");
    }

    // ── 500 — fallback ───────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        log.error("lỗi không mong đợi", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "lỗi nội bộ");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static ResponseEntity<ApiError> body(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(ApiError.of(code, message));
    }

    private static String formatFieldError(FieldError fe) {
        return fe.getField() + ": " + fe.getDefaultMessage();
    }
}
