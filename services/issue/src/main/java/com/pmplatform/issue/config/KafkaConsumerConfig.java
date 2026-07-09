package com.pmplatform.issue.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties.AckMode;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Kafka listener container factory for the projection consumers.
 *
 * <p>The {@code ConsumerFactory} is Spring Boot auto-configured from
 * {@code spring.kafka.*} in application.yml (value = {@code ByteArrayDeserializer}).
 * Here we only pin {@link AckMode#MANUAL_IMMEDIATE} so listeners can take an
 * {@code Acknowledgment} and ack explicitly AFTER a successful DB write
 * (at-least-once). This overrides the auto-configured factory of the same name.
 */
@Configuration
public class KafkaConsumerConfig {

    // Khoảng chờ giữa các lần retry khi listener ném lỗi (vd DB tạm chết). 5s để DB có
    // thời gian hồi phục, tránh busy-loop retry ở 0ms.
    private static final long RETRY_INTERVAL_MS = 5_000L;

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, byte[]> kafkaListenerContainerFactory(
            ConsumerFactory<?, ?> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, byte[]> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        @SuppressWarnings("unchecked")
        ConsumerFactory<String, byte[]> cf = (ConsumerFactory<String, byte[]>) consumerFactory;
        factory.setConsumerFactory(cf);
        factory.getContainerProperties().setAckMode(AckMode.MANUAL_IMMEDIATE);

        // At-least-once cho projection: PHẢI set error handler tường minh. Mặc định của
        // Spring Boot là DefaultErrorHandler + FixedBackOff(0, 9) → retry 10 lần tức thì
        // (0ms) rồi "recover" (chỉ log) và COMMIT offset — kể cả khi ta để MANUAL_IMMEDIATE
        // (ackAfterHandle=true). Nghĩa là khi DB chết lâu hơn vài ms, record bị BỎ luôn →
        // vỡ đảm bảo giao-lại ghi trong Javadoc của consumer.
        //
        // Message hỏng (poison) đã được listener bắt & ack ngay tại chỗ, nên lỗi lọt tới
        // error handler chỉ là lỗi TẠM (DB down). Dùng FixedBackOff vô hạn: chặn-và-thử-lại
        // mãi cho tới khi DB hồi. Recoverer không bao giờ chạy → offset không bao giờ bị
        // commit qua record lỗi → không mất event, không kẹt vĩnh viễn ở poison.
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
                new FixedBackOff(RETRY_INTERVAL_MS, FixedBackOff.UNLIMITED_ATTEMPTS));
        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }
}
