package com.pmplatform.issue.event;

import com.google.protobuf.InvalidProtocolBufferException;
import com.pmplatform.issue.projection.ProjectionService;
import com.pmplatform.proto.pm.v1.UserCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Consumer topic {@code auth.user.events} (do auth-service phát khi có user mới).
 *
 * <p>KHÁC với workspace.events: topic này gửi {@link UserCreatedEvent} RAW — KHÔNG bọc
 * trong EventEnvelope. Vì vậy parse thẳng {@code UserCreatedEvent.parseFrom(value)}.
 *
 * <p>Ack THỦ CÔNG sau khi upsert users_projection thành công (at-least-once). Upsert
 * idempotent nên message giao lại vẫn an toàn. Message hỏng là poison → ack để bỏ qua.
 */
@Component
public class UserEventsConsumer {

    private static final Logger log = LoggerFactory.getLogger(UserEventsConsumer.class);

    private final ProjectionService projections;

    public UserEventsConsumer(ProjectionService projections) {
        this.projections = projections;
    }

    @KafkaListener(
            topics = "${pm.issue.kafka.topic-user-events}",
            groupId = "${spring.kafka.consumer.group-id:issue-service}")
    public void onMessage(byte[] value, Acknowledgment ack) {
        final UserCreatedEvent e;
        try {
            e = UserCreatedEvent.parseFrom(value);
        } catch (InvalidProtocolBufferException ex) {
            log.error("auth.user.events: UserCreatedEvent hỏng, bỏ qua (poison message)", ex);
            ack.acknowledge();
            return;
        }

        projections.upsertUser(e.getUserId(), e.getEmail(), e.getName(), e.getAvatarUrl());
        // DB đã commit → mới ack.
        ack.acknowledge();
    }
}
