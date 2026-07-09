package com.pmplatform.issue.web;

/**
 * Danh tính caller cho request hiện tại — lấy TỪ HEADER do api-gateway inject
 * ({@code X-User-ID} / {@code X-User-Email}) sau khi gateway đã verify JWT.
 *
 * <p>issue-service TIN header này (chạy trong internal network sau gateway) và KHÔNG bao giờ
 * đọc danh tính từ body request (chống giả mạo). {@link com.pmplatform.issue.web.filter.CurrentUserFilter}
 * dựng object này rồi đặt vào request attribute {@link #ATTRIBUTE}; controller nhận qua
 * {@link CurrentUserArgumentResolver}.
 *
 * @param userId id user (int64) — luôn có khi route nằm sau CurrentUserFilter.
 * @param email  email caller — tuỳ chọn (có thể null nếu gateway không gửi X-User-Email).
 */
public record CurrentUser(long userId, String email) {

    /** Key của request attribute nơi CurrentUserFilter lưu instance cho request hiện tại. */
    public static final String ATTRIBUTE = "com.pmplatform.issue.web.CurrentUser";
}
