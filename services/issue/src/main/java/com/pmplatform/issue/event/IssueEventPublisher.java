package com.pmplatform.issue.event;

import com.google.protobuf.Message;
import com.google.protobuf.Timestamp;
import com.pmplatform.issue.domain.Issue;
import com.pmplatform.proto.pm.v1.EventEnvelope;
import com.pmplatform.proto.pm.v1.IssueCreatedEvent;
import com.pmplatform.proto.pm.v1.IssueTransitionedEvent;
import com.pmplatform.proto.pm.v1.IssueUpdatedEvent;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Phát domain event của issue-service lên topic {@code issue.events} (protobuf), để các
 * service khác (search/notification/report/audit/ai) tiêu thụ mà không gọi trực tiếp.
 *
 * <p>Mỗi event bọc trong {@link EventEnvelope}: {@code event_type} để consumer dispatch,
 * {@code workspace_id} làm partition key (giữ thứ tự trong 1 workspace), {@code payload} =
 * message cụ thể đã marshal. Khớp đúng wire-format của producer Go (workspace/auth).
 *
 * <p>BEST-EFFORT: DB đã ghi xong khi tới đây; nếu Kafka lỗi ta CHỈ log, KHÔNG ném ra để
 * không làm hỏng request của người dùng (at-least-once — event có thể thiếu, không sao).
 */
@Component
public class IssueEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(IssueEventPublisher.class);

    // Event type strings — khớp mô tả trong proto/pm/v1/issue.proto.
    private static final String ISSUE_CREATED = "issue.created";
    private static final String ISSUE_UPDATED = "issue.updated";
    private static final String ISSUE_TRANSITIONED = "issue.transitioned";
    private static final String EVENT_VERSION = "v1";

    private final KafkaTemplate<String, byte[]> kafka;
    private final String topic;

    public IssueEventPublisher(
            KafkaTemplate<String, byte[]> kafka,
            @Value("${pm.issue.kafka.topic-issue-events}") String topic) {
        this.kafka = kafka;
        this.topic = topic;
    }

    /** Phát issue.created sau khi tạo issue thành công. */
    public void publishIssueCreated(long workspaceId, long actorId, Issue issue) {
        IssueCreatedEvent payload = IssueCreatedEvent.newBuilder()
                .setIssueId(issue.getId())
                .setProjectId(issue.getProjectId())
                .setKey(issue.getKey())
                .setSummary(issue.getSummary())
                .setReporterId(issue.getReporterId())
                .setAssigneeId(issue.getAssigneeId() == null ? 0L : issue.getAssigneeId())
                .build();
        publish(ISSUE_CREATED, workspaceId, actorId, payload);
    }

    /** Phát issue.updated sau khi cập nhật field (changedFields = tên cột đã đổi). */
    public void publishIssueUpdated(long workspaceId, long actorId, Issue issue, List<String> changedFields) {
        IssueUpdatedEvent payload = IssueUpdatedEvent.newBuilder()
                .setIssueId(issue.getId())
                .setKey(issue.getKey())
                .addAllChangedFields(changedFields)
                .build();
        publish(ISSUE_UPDATED, workspaceId, actorId, payload);
    }

    /** Phát issue.transitioned sau khi chuyển status hợp lệ. */
    public void publishIssueTransitioned(
            long workspaceId, long actorId, Issue issue, String fromStatus, String toStatus) {
        IssueTransitionedEvent payload = IssueTransitionedEvent.newBuilder()
                .setIssueId(issue.getId())
                .setKey(issue.getKey())
                .setFromStatus(fromStatus)
                .setToStatus(toStatus)
                .build();
        publish(ISSUE_TRANSITIONED, workspaceId, actorId, payload);
    }

    // Bọc payload vào EventEnvelope rồi gửi. Mọi lỗi (đồng bộ khi build, hay bất đồng bộ
    // khi gửi) đều chỉ được log — best-effort, không ném ra ngoài.
    private void publish(String eventType, long workspaceId, long actorId, Message payload) {
        try {
            EventEnvelope env = EventEnvelope.newBuilder()
                    .setEventId(UUID.randomUUID().toString())
                    .setEventType(eventType)
                    .setEventVersion(EVENT_VERSION)
                    .setWorkspaceId(workspaceId)
                    .setActorId(actorId)
                    .setOccurredAt(toTimestamp(Instant.now()))
                    .setPayload(payload.toByteString())
                    .build();

            // Key = workspace_id → cùng workspace vào cùng partition (giữ thứ tự event).
            kafka.send(topic, String.valueOf(workspaceId), env.toByteArray())
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("gửi issue event thất bại (async): event_type={} workspace_id={}",
                                    eventType, workspaceId, ex);
                        }
                    });
        } catch (Exception ex) {
            log.error("dựng/gửi issue event thất bại: event_type={} workspace_id={}",
                    eventType, workspaceId, ex);
        }
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.newBuilder()
                .setSeconds(instant.getEpochSecond())
                .setNanos(instant.getNano())
                .build();
    }
}
