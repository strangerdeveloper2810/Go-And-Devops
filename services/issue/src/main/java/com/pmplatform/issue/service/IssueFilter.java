package com.pmplatform.issue.service;

import java.util.List;

/**
 * Bộ lọc khi list issue theo project. Field null/rỗng = bỏ qua tiêu chí đó.
 * labels: issue phải chứa TẤT CẢ nhãn trong danh sách mới khớp.
 */
public record IssueFilter(
        String status,
        Long assigneeId,
        Long sprintId,
        List<String> labels) {

    /** Bộ lọc rỗng — trả về mọi issue còn sống của project. */
    public static IssueFilter none() {
        return new IssueFilter(null, null, null, null);
    }
}
