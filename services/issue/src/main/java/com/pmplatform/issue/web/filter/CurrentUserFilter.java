package com.pmplatform.issue.web.filter;

import com.pmplatform.issue.web.CurrentUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CurrentUserFilter đọc danh tính do api-gateway inject cho MỖI request tới {@code /api/**}:
 * header {@code X-User-ID} (int64) và {@code X-User-Email} (tuỳ chọn). Parse thành công thì
 * đặt một {@link CurrentUser} vào request attribute để tầng controller dùng.
 *
 * <p>Thiếu hoặc không parse được {@code X-User-ID} → chặn ngay với 401 và body
 * {@code {"error":{"code":"MISSING_USER"}}} (cùng contract với workspace {@code RequireUser}).
 * TIN header — gateway đã verify JWT và strip mọi X-User-* client gửi vào; issue-service
 * KHÔNG bao giờ đọc danh tính từ body.
 *
 * <p>Các path ngoài {@code /api/} (vd {@code /actuator/health}, probes) KHÔNG qua filter này
 * (xem {@link #shouldNotFilter}) nên vẫn public cho health check / metrics.
 */
@Component
public class CurrentUserFilter extends OncePerRequestFilter {

    static final String HEADER_USER_ID = "X-User-ID";
    static final String HEADER_USER_EMAIL = "X-User-Email";

    // Body 401 cố định (giống errorBody của các service Go): code MISSING_USER.
    private static final String MISSING_USER_BODY =
            "{\"error\":{\"code\":\"MISSING_USER\",\"message\":\"missing or invalid X-User-ID header\"}}";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        String raw = request.getHeader(HEADER_USER_ID);
        if (raw == null || raw.isBlank()) {
            reject(response);
            return;
        }

        long userId;
        try {
            userId = Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            reject(response);
            return;
        }

        String email = request.getHeader(HEADER_USER_EMAIL); // optional — có thể null
        request.setAttribute(CurrentUser.ATTRIBUTE, new CurrentUser(userId, email));
        chain.doFilter(request, response);
    }

    // Chỉ bảo vệ các route API; để health/metrics/actuator public.
    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.getWriter().write(MISSING_USER_BODY);
    }
}
