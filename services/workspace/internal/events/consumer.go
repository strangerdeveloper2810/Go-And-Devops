// Package events chứa Kafka consumer cho workspace-service.
//
// Consumer lắng nghe topic auth.user.events (do auth-service phát khi có user
// mới đăng ký) và gọi service để tạo user projection + default workspace.
// Đây là điểm nối giữa 2 microservice qua event, thay vì gọi trực tiếp (loose coupling).
package events

import (
	"context"
	"errors"
	"log/slog"

	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/service"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
)

// Consumer đọc event user.created từ Kafka rồi đẩy vào WorkspaceService.
// Giữ *kafka.Reader (đã cấu hình GroupID → Kafka tự quản offset + rebalance).
type Consumer struct {
	reader *kafka.Reader
	svc    service.WorkspaceService
	logger *slog.Logger
}

// NewConsumer tạo Reader với GroupID = consumer group (workspace-service).
// Khi có GroupID, kafka-go tự commit offset sau mỗi ReadMessage thành công
// → không cần commit thủ công, và nhiều instance cùng group sẽ chia nhau partition.
func NewConsumer(cfg config.KafkaConfig, svc service.WorkspaceService, logger *slog.Logger) *Consumer {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers: cfg.Brokers,
		GroupID: cfg.ConsumerGroup,
		Topic:   cfg.UserEventsTopic,
	})
	return &Consumer{reader: r, svc: svc, logger: logger}
}

// Run chạy vòng lặp đọc message cho tới khi ctx bị cancel (lúc shutdown).
// Mỗi message: proto.Unmarshal → EnsureUserAndDefaultWorkspace (idempotent).
// Lỗi xử lý 1 message KHÔNG dừng consumer — log rồi bỏ qua (at-least-once,
// idempotent nên nhận trùng vẫn an toàn).
func (c *Consumer) Run(ctx context.Context) error {
	c.logger.Info("kafka consumer started",
		slog.String("topic", c.reader.Config().Topic),
		slog.String("group", c.reader.Config().GroupID),
	)
	// Đóng reader khi thoát để trả kết nối + commit offset cuối cùng.
	defer func() {
		if err := c.reader.Close(); err != nil {
			c.logger.Error("close kafka reader", slog.Any("err", err))
		}
	}()

	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			// ctx cancel (shutdown) → thoát êm, không coi là lỗi.
			if errors.Is(err, context.Canceled) || ctx.Err() != nil {
				c.logger.Info("kafka consumer stopping")
				return nil
			}
			c.logger.Error("read kafka message", slog.Any("err", err))
			continue
		}

		var evt pmv1.UserCreatedEvent
		if err := proto.Unmarshal(msg.Value, &evt); err != nil {
			// Message hỏng/không đúng schema → bỏ qua (offset đã được commit
			// bởi ReadMessage nên không kẹt lại mãi ở message lỗi).
			c.logger.Error("unmarshal UserCreatedEvent", slog.Any("err", err))
			continue
		}

		if err := c.svc.EnsureUserAndDefaultWorkspace(ctx, evt.UserId, evt.Email, evt.Name, evt.AvatarUrl); err != nil {
			c.logger.Error("ensure user and default workspace",
				slog.Any("err", err),
				slog.Int64("user_id", evt.UserId),
			)
			continue
		}
		c.logger.Info("processed user.created", slog.Int64("user_id", evt.UserId))
	}
}
