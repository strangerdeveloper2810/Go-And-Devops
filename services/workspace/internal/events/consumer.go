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
	"time"

	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/service"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
)

// Backoff cho retry khi xử lý message lỗi tạm thời (VD: DB down). Tăng dần theo
// cấp số nhân từ base tới max để không quay vòng nóng (busy-loop) làm ngập log.
const (
	retryBaseBackoff = 500 * time.Millisecond
	retryMaxBackoff  = 30 * time.Second
)

// Consumer đọc event user.created từ Kafka rồi đẩy vào WorkspaceService.
// Giữ *kafka.Reader (đã cấu hình GroupID → Kafka tự quản offset + rebalance).
type Consumer struct {
	reader *kafka.Reader
	svc    service.WorkspaceService
	logger *slog.Logger
}

// NewConsumer tạo Reader với GroupID = consumer group (workspace-service).
// Có GroupID → nhiều instance cùng group chia nhau partition + rebalance.
// Offset được commit THỦ CÔNG trong Run (FetchMessage + CommitMessages) để đạt
// at-least-once: chỉ commit SAU khi xử lý message xong, tránh mất event khi lỗi.
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
	// Đóng reader khi thoát để trả kết nối (offset đã commit thủ công ở dưới).
	defer func() {
		if err := c.reader.Close(); err != nil {
			c.logger.Error("close kafka reader", slog.Any("err", err))
		}
	}()

	for {
		// FetchMessage KHÔNG tự commit offset (khác ReadMessage) → mình chủ động
		// commit sau khi xử lý xong để đạt at-least-once, không mất event khi lỗi.
		msg, err := c.reader.FetchMessage(ctx)
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
			// Message hỏng/không đúng schema → retry cũng vô ích, commit luôn để
			// bỏ qua hẳn (không kẹt lại mãi ở message lỗi kể cả sau khi restart).
			c.logger.Error("unmarshal UserCreatedEvent", slog.Any("err", err))
			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				c.logger.Error("commit kafka message", slog.Any("err", err))
			}
			continue
		}

		// Lỗi tạm thời (VD: DB down) → PHẢI retry CHÍNH message này tại chỗ, KHÔNG
		// được `continue` để fetch message kế. Lý do: FetchMessage đã đẩy vị trí đọc
		// nội bộ sang record kế, và kafka-go CommitMessages commit offset kiểu
		// cumulative (tới-VÀ-gồm-cả message được commit). Nếu bỏ qua message lỗi rồi
		// commit một message SAU nó, offset của message lỗi bị commit theo → mất hẳn,
		// không bao giờ giao lại (trái với ý định at-least-once). Vậy nên retry có
		// backoff cho tới khi thành công; handler idempotent nên retry an toàn.
		// Chỉ message poison (unmarshal lỗi, ở nhánh trên) mới được skip + commit.
		backoff := retryBaseBackoff
		for {
			err := c.svc.EnsureUserAndDefaultWorkspace(ctx, evt.UserId, evt.Email, evt.Name, evt.AvatarUrl)
			if err == nil {
				break
			}
			// ctx cancel (shutdown) làm service call fail → thoát êm, không log ầm ĩ.
			if errors.Is(err, context.Canceled) || ctx.Err() != nil {
				c.logger.Info("kafka consumer stopping")
				return nil
			}
			c.logger.Error("ensure user and default workspace",
				slog.Any("err", err),
				slog.Int64("user_id", evt.UserId),
			)
			// Chờ backoff rồi thử lại; ctx cancel trong lúc chờ cũng thoát êm.
			select {
			case <-ctx.Done():
				c.logger.Info("kafka consumer stopping")
				return nil
			case <-time.After(backoff):
			}
			if backoff *= 2; backoff > retryMaxBackoff {
				backoff = retryMaxBackoff
			}
		}

		// Xử lý xong mới commit → offset chỉ tiến khi message đã được xử lý thành công.
		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			c.logger.Error("commit kafka message", slog.Any("err", err))
		}
		c.logger.Info("processed user.created", slog.Int64("user_id", evt.UserId))
	}
}
