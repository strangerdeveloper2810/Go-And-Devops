package com.pmplatform.issue.web;

/**
 * Body lỗi chuẩn của toàn platform: {@code {"error":{"code":"...","message":"..."}}}
 * — khớp {@code errorBody} của các service Go (auth/workspace) để client xử lý đồng nhất.
 */
public record ApiError(Body error) {

    public record Body(String code, String message) {}

    public static ApiError of(String code, String message) {
        return new ApiError(new Body(code, message));
    }
}
