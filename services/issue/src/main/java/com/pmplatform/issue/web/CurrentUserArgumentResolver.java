package com.pmplatform.issue.web;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Cho phép controller khai báo tham số kiểu {@link CurrentUser} và Spring tự bơm vào từ
 * request attribute mà {@link com.pmplatform.issue.web.filter.CurrentUserFilter} đã đặt.
 *
 * <p>Nếu attribute thiếu (route không nằm sau filter) thì ném {@link IllegalStateException}
 * — đây là lỗi lập trình (gắn sai route), không phải lỗi input của client.
 */
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return CurrentUser.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {

        Object value = webRequest.getAttribute(CurrentUser.ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (value instanceof CurrentUser currentUser) {
            return currentUser;
        }
        throw new IllegalStateException(
                "CurrentUser chưa được set — route phải nằm sau CurrentUserFilter");
    }
}
