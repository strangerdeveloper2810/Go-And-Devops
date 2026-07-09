package com.pmplatform.issue.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties.AckMode;

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

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, byte[]> kafkaListenerContainerFactory(
            ConsumerFactory<?, ?> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, byte[]> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        @SuppressWarnings("unchecked")
        ConsumerFactory<String, byte[]> cf = (ConsumerFactory<String, byte[]>) consumerFactory;
        factory.setConsumerFactory(cf);
        factory.getContainerProperties().setAckMode(AckMode.MANUAL_IMMEDIATE);
        return factory;
    }
}
