// Package events chứa Kafka producer cho auth-service.
//
// Khi user đăng ký thành công, auth-service phát event user.created lên Kafka.
// Các service khác (workspace) consume để tự tạo dữ liệu liên quan mà không
// cần auth gọi trực tiếp — kiến trúc event-driven, loose coupling.
package events

import (
	"context"
	"log/slog"
	"strconv"

	"github.com/pm-platform/auth/internal/config"
	"github.com/pm-platform/auth/internal/model"
	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
)

// Producer bọc *kafka.Writer để phát event lên topic auth.user.events.
// Balancer Hash → cùng key (user_id) luôn vào cùng partition → giữ thứ tự
// event của 1 user.
type Producer struct {
	writer *kafka.Writer
	logger *slog.Logger
}

func NewProducer(cfg config.KafkaConfig, logger *slog.Logger) *Producer {
	w := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Brokers...),
		Topic:    cfg.UserEventsTopic,
		Balancer: &kafka.Hash{},
	}
	return &Producer{writer: w, logger: logger}
}

// PublishUserCreated phát event khi có user mới. BEST-EFFORT (at-least-once):
// mọi lỗi chỉ được LOG, KHÔNG trả về — vì đăng ký đã thành công ở DB,
// không được để lỗi Kafka làm hỏng flow đăng ký của người dùng.
func (p *Producer) PublishUserCreated(ctx context.Context, user *model.User) {
	evt := &pmv1.UserCreatedEvent{
		UserId:    user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarUrl: user.AvatarURL,
	}
	value, err := proto.Marshal(evt)
	if err != nil {
		p.logger.Error("marshal UserCreatedEvent", slog.Any("err", err), slog.Int64("user_id", user.ID))
		return
	}

	// Key = user_id → dùng cho partitioning (Hash balancer) + idempotency phía consumer.
	key := []byte(strconv.FormatInt(user.ID, 10))
	if err := p.writer.WriteMessages(ctx, kafka.Message{Key: key, Value: value}); err != nil {
		p.logger.Error("publish user.created", slog.Any("err", err), slog.Int64("user_id", user.ID))
		return
	}
	p.logger.Info("published user.created", slog.Int64("user_id", user.ID))
}

// Close đóng writer (flush message còn đọng) khi service shutdown.
func (p *Producer) Close() error {
	return p.writer.Close()
}
