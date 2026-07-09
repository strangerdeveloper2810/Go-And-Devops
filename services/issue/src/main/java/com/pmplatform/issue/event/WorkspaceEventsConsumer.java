package com.pmplatform.issue.event;

import com.google.protobuf.InvalidProtocolBufferException;
import com.pmplatform.issue.projection.ProjectionService;
import com.pmplatform.proto.pm.v1.EventEnvelope;
import com.pmplatform.proto.pm.v1.MemberAddedEvent;
import com.pmplatform.proto.pm.v1.MemberRemovedEvent;
import com.pmplatform.proto.pm.v1.ProjectCreatedEvent;
import com.pmplatform.proto.pm.v1.WorkspaceCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Consumer topic {@code workspace.events} (do workspace-service phát). Mỗi record
 * là 1 {@link EventEnvelope} protobuf; dispatch theo {@code event_type} rồi upsert
 * read-model tương ứng — đây là cách issue-service có dữ liệu project + membership
 * để authorize cục bộ, thay vì gọi trực tiếp workspace-service (loose coupling).
 *
 * <p>Ack THỦ CÔNG (MANUAL_IMMEDIATE) và chỉ ack SAU khi ghi DB thành công: nếu DB lỗi
 * thì không ack → Kafka giao lại (at-least-once). Handler idempotent nên nhận trùng
 * vẫn an toàn. Message hỏng (không parse được) là poison → ack luôn để không kẹt partition.
 */
@Component
public class WorkspaceEventsConsumer {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceEventsConsumer.class);

    // Event type strings — khớp với producer bên workspace-service (Go).
    private static final String WORKSPACE_CREATED = "workspace.created";
    private static final String PROJECT_CREATED = "project.created";
    private static final String MEMBER_ADDED = "member.added";
    private static final String MEMBER_REMOVED = "member.removed";

    private final ProjectionService projections;

    public WorkspaceEventsConsumer(ProjectionService projections) {
        this.projections = projections;
    }

    @KafkaListener(
            topics = "${pm.issue.kafka.topic-workspace-events}",
            groupId = "${spring.kafka.consumer.group-id:issue-service}")
    public void onMessage(byte[] value, Acknowledgment ack) {
        final EventEnvelope env;
        try {
            env = EventEnvelope.parseFrom(value);
        } catch (InvalidProtocolBufferException ex) {
            // Envelope hỏng → retry cũng vô ích; ack để bỏ qua hẳn (không kẹt partition).
            log.error("workspace.events: envelope hỏng, bỏ qua (poison message)", ex);
            ack.acknowledge();
            return;
        }

        try {
            dispatch(env);
        } catch (InvalidProtocolBufferException ex) {
            // Payload hỏng cho 1 event_type đã biết → cũng là poison, ack để bỏ qua.
            log.error("workspace.events: payload hỏng cho event_type={}, bỏ qua",
                    env.getEventType(), ex);
            ack.acknowledge();
            return;
        }
        // Ghi DB (trong ProjectionService @Transactional) đã commit xong → giờ mới ack.
        ack.acknowledge();
    }

    private void dispatch(EventEnvelope env) throws InvalidProtocolBufferException {
        switch (env.getEventType()) {
            case WORKSPACE_CREATED -> {
                WorkspaceCreatedEvent e = WorkspaceCreatedEvent.parseFrom(env.getPayload());
                projections.upsertWorkspace(e.getWorkspaceId(), e.getSlug(), e.getName());
            }
            case PROJECT_CREATED -> {
                ProjectCreatedEvent e = ProjectCreatedEvent.parseFrom(env.getPayload());
                projections.upsertProject(e.getProjectId(), e.getWorkspaceId(), e.getKey(), e.getName());
            }
            case MEMBER_ADDED -> {
                MemberAddedEvent e = MemberAddedEvent.parseFrom(env.getPayload());
                projections.upsertMember(e.getWorkspaceId(), e.getUserId(), e.getRole());
            }
            case MEMBER_REMOVED -> {
                MemberRemovedEvent e = MemberRemovedEvent.parseFrom(env.getPayload());
                projections.removeMember(e.getWorkspaceId(), e.getUserId());
            }
            // event_type khác (VD event nội bộ workspace không liên quan) → bỏ qua, vẫn ack.
            default -> log.debug("workspace.events: bỏ qua event_type không quan tâm: {}",
                    env.getEventType());
        }
    }
}
