package com.pmplatform.issue.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * issue_field_values: giá trị custom field của 1 issue.
 * Khoá chính ghép (issue_id, field_id); value JSONB linh hoạt mọi type field.
 */
@Entity
@Table(name = "issue_field_values", schema = "issue")
@IdClass(IssueFieldValue.IssueFieldValueId.class)
public class IssueFieldValue {

    @Id
    @Column(name = "issue_id")
    private Long issueId;

    @Id
    @Column(name = "field_id")
    private Long fieldId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "value")
    private JsonNode value;

    public Long getIssueId() {
        return issueId;
    }

    public void setIssueId(Long issueId) {
        this.issueId = issueId;
    }

    public Long getFieldId() {
        return fieldId;
    }

    public void setFieldId(Long fieldId) {
        this.fieldId = fieldId;
    }

    public JsonNode getValue() {
        return value;
    }

    public void setValue(JsonNode value) {
        this.value = value;
    }

    /** Composite PK cho issue_field_values. */
    public static class IssueFieldValueId implements Serializable {

        private Long issueId;
        private Long fieldId;

        public IssueFieldValueId() {
        }

        public IssueFieldValueId(Long issueId, Long fieldId) {
            this.issueId = issueId;
            this.fieldId = fieldId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof IssueFieldValueId that)) {
                return false;
            }
            return Objects.equals(issueId, that.issueId) && Objects.equals(fieldId, that.fieldId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(issueId, fieldId);
        }
    }
}
