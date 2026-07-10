// Package events chứa Kafka consumer cho page-service.
//
// page-service dựng read-model projection từ 2 nguồn event (loose coupling —
// chỉ đọc-và-chiếu, không gọi trực tiếp service khác):
//   - workspace.events: mỗi message bọc trong common EventEnvelope; dispatch theo
//     EventType → workspace.created (workspaces_projection), member.added /
//     member.removed (members_projection). project.created bị bỏ qua (page không
//     cần projects). Membership projection = nguồn authz chính của page-service.
//   - auth.user.events: RAW pmv1.UserCreatedEvent (KHÔNG bọc envelope) →
//     users_projection.
package events

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/pm-platform/page/internal/config"
	"github.com/pm-platform/page/internal/model"
	"github.com/pm-platform/page/internal/repository"
	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
)

// Backoff cho retry khi xử lý message lỗi tạm thời (VD: DB down). Tăng dần theo
// cấp số nhân từ base tới max để không quay vòng nóng (busy-loop) làm ngập log.
const (
	retryBaseBackoff = 500 * time.Millisecond
	retryMaxBackoff  = 30 * time.Second
)

// Event type strings trong EventEnvelope.EventType — khớp workspace-service
// producer. Consumer dispatch dựa trên các hằng này. project.created cố ý KHÔNG
// khai báo ở đây vì page không quan tâm (rơi vào nhánh default → bỏ qua).
const (
	eventTypeWorkspaceCreated = "workspace.created"
	eventTypeMemberAdded      = "member.added"
	eventTypeMemberRemoved    = "member.removed"
)

// errPoison đánh dấu message hỏng/sai schema (unmarshal fail). Retry vô ích nên
// consumer skip + commit thay vì retry. Phân biệt với lỗi tạm thời (DB down)
// bằng errors.Is trong vòng lặp consume.
var errPoison = errors.New("poison message")

// Consumer đọc event từ Kafka rồi chiếu vào các bảng projection của page.
// Hai reader tách biệt cho 2 topic, cùng GroupID = page-service để Kafka quản lý
// offset + phân phối partition. Offset được commit THỦ CÔNG (FetchMessage +
// CommitMessages) sau khi xử lý xong để đạt at-least-once.
type Consumer struct {
	wsReader   *kafka.Reader
	userReader *kafka.Reader
	wsRepo     repository.WorkspaceProjectionRepo
	memberRepo repository.MemberProjectionRepo
	userRepo   repository.UserProjectionRepo
	logger     *slog.Logger
}

// NewConsumer tạo 2 Reader (workspace.events + auth.user.events), cùng GroupID =
// consumer group (page-service). Có GroupID → nhiều instance cùng group chia nhau
// partition + rebalance. Offset commit thủ công trong consume để đạt at-least-once:
// chỉ commit SAU khi xử lý message xong, tránh mất event khi lỗi.
func NewConsumer(
	cfg config.KafkaConfig,
	wsRepo repository.WorkspaceProjectionRepo,
	memberRepo repository.MemberProjectionRepo,
	userRepo repository.UserProjectionRepo,
	logger *slog.Logger,
) *Consumer {
	wsReader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: cfg.Brokers,
		GroupID: cfg.ConsumerGroup,
		Topic:   cfg.WorkspaceEventsTopic,
	})
	userReader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: cfg.Brokers,
		GroupID: cfg.ConsumerGroup,
		Topic:   cfg.UserEventsTopic,
	})
	return &Consumer{
		wsReader:   wsReader,
		userReader: userReader,
		wsRepo:     wsRepo,
		memberRepo: memberRepo,
		userRepo:   userRepo,
		logger:     logger,
	}
}

// RunWorkspaceEvents đọc topic workspace.events (EventEnvelope-wrapped) tới khi
// ctx bị cancel. Chạy trong goroutine riêng từ main (Phase 6).
func (c *Consumer) RunWorkspaceEvents(ctx context.Context) error {
	return c.consume(ctx, c.wsReader, c.handleWorkspaceEvent)
}

// RunUserEvents đọc topic auth.user.events (RAW UserCreatedEvent) tới khi ctx bị
// cancel. Chạy trong goroutine riêng từ main (Phase 6).
func (c *Consumer) RunUserEvents(ctx context.Context) error {
	return c.consume(ctx, c.userReader, c.handleUserEvent)
}

// consume chạy vòng lặp đọc message cho tới khi ctx bị cancel (lúc shutdown).
// Boilerplate at-least-once giống hệt workspace-service: FetchMessage (KHÔNG tự
// commit) → handle → CommitMessages chỉ khi xử lý xong. handle trả:
//   - nil            → thành công, commit.
//   - errPoison      → message hỏng, skip + commit (retry vô ích).
//   - lỗi khác       → lỗi tạm thời, retry CHÍNH message này tại chỗ có backoff.
func (c *Consumer) consume(ctx context.Context, reader *kafka.Reader, handle func(context.Context, kafka.Message) error) error {
	topic := reader.Config().Topic
	c.logger.Info("kafka consumer started",
		slog.String("topic", topic),
		slog.String("group", reader.Config().GroupID),
	)
	// Đóng reader khi thoát để trả kết nối (offset đã commit thủ công ở dưới).
	defer func() {
		if err := reader.Close(); err != nil {
			c.logger.Error("close kafka reader", slog.String("topic", topic), slog.Any("err", err))
		}
	}()

	for {
		// FetchMessage KHÔNG tự commit offset (khác ReadMessage) → mình chủ động
		// commit sau khi xử lý xong để đạt at-least-once, không mất event khi lỗi.
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			// ctx cancel (shutdown) → thoát êm, không coi là lỗi.
			if errors.Is(err, context.Canceled) || ctx.Err() != nil {
				c.logger.Info("kafka consumer stopping", slog.String("topic", topic))
				return nil
			}
			c.logger.Error("read kafka message", slog.String("topic", topic), slog.Any("err", err))
			continue
		}

		// Lỗi tạm thời (VD: DB down) → PHẢI retry CHÍNH message này tại chỗ, KHÔNG
		// được `continue` để fetch message kế. Lý do: FetchMessage đã đẩy vị trí đọc
		// nội bộ sang record kế, và kafka-go CommitMessages commit offset kiểu
		// cumulative (tới-VÀ-gồm-cả message được commit). Nếu bỏ qua message lỗi rồi
		// commit một message SAU nó, offset của message lỗi bị commit theo → mất hẳn,
		// không bao giờ giao lại (trái với ý định at-least-once). Vậy nên retry có
		// backoff cho tới khi thành công; handler idempotent nên retry an toàn.
		// Chỉ message poison (unmarshal lỗi → errPoison) mới được skip + commit.
		backoff := retryBaseBackoff
		for {
			err := handle(ctx, msg)
			if err == nil {
				break
			}
			// Message hỏng/sai schema → retry cũng vô ích, break để commit + bỏ qua
			// hẳn (không kẹt lại mãi ở message lỗi kể cả sau khi restart).
			if errors.Is(err, errPoison) {
				c.logger.Error("skip poison message", slog.String("topic", topic), slog.Any("err", err))
				break
			}
			// ctx cancel (shutdown) làm handle fail → thoát êm, không log ầm ĩ.
			if errors.Is(err, context.Canceled) || ctx.Err() != nil {
				c.logger.Info("kafka consumer stopping", slog.String("topic", topic))
				return nil
			}
			c.logger.Error("handle kafka message", slog.String("topic", topic), slog.Any("err", err))
			// Chờ backoff rồi thử lại; ctx cancel trong lúc chờ cũng thoát êm.
			select {
			case <-ctx.Done():
				c.logger.Info("kafka consumer stopping", slog.String("topic", topic))
				return nil
			case <-time.After(backoff):
			}
			if backoff *= 2; backoff > retryMaxBackoff {
				backoff = retryMaxBackoff
			}
		}

		// Xử lý xong mới commit → offset chỉ tiến khi message đã được xử lý thành công.
		if err := reader.CommitMessages(ctx, msg); err != nil {
			c.logger.Error("commit kafka message", slog.String("topic", topic), slog.Any("err", err))
		}
	}
}

// handleWorkspaceEvent parse EventEnvelope rồi dispatch theo EventType, dựng
// workspaces_projection + members_projection. Payload trong envelope là message
// cụ thể đã proto-marshal → unmarshal tiếp theo EventType. Upsert/Remove idempotent
// nên nhận trùng vẫn an toàn. Sai schema → errPoison (skip + commit).
func (c *Consumer) handleWorkspaceEvent(ctx context.Context, msg kafka.Message) error {
	var env pmv1.EventEnvelope
	if err := proto.Unmarshal(msg.Value, &env); err != nil {
		return fmt.Errorf("unmarshal EventEnvelope: %w: %w", err, errPoison)
	}

	switch env.EventType {
	case eventTypeWorkspaceCreated:
		var evt pmv1.WorkspaceCreatedEvent
		if err := proto.Unmarshal(env.Payload, &evt); err != nil {
			return fmt.Errorf("unmarshal WorkspaceCreatedEvent: %w: %w", err, errPoison)
		}
		ws := &model.WorkspaceProjection{
			ID:   evt.WorkspaceId,
			Slug: evt.Slug,
			Name: evt.Name,
		}
		if err := c.wsRepo.Upsert(ctx, ws); err != nil {
			return fmt.Errorf("upsert workspace projection: %w", err)
		}
		c.logger.Info("projected workspace.created", slog.Int64("workspace_id", evt.WorkspaceId))

	case eventTypeMemberAdded:
		var evt pmv1.MemberAddedEvent
		if err := proto.Unmarshal(env.Payload, &evt); err != nil {
			return fmt.Errorf("unmarshal MemberAddedEvent: %w: %w", err, errPoison)
		}
		member := &model.MemberProjection{
			WorkspaceID: evt.WorkspaceId,
			UserID:      evt.UserId,
			Role:        evt.Role,
		}
		if err := c.memberRepo.Upsert(ctx, member); err != nil {
			return fmt.Errorf("upsert member projection: %w", err)
		}
		c.logger.Info("projected member.added",
			slog.Int64("workspace_id", evt.WorkspaceId), slog.Int64("user_id", evt.UserId))

	case eventTypeMemberRemoved:
		var evt pmv1.MemberRemovedEvent
		if err := proto.Unmarshal(env.Payload, &evt); err != nil {
			return fmt.Errorf("unmarshal MemberRemovedEvent: %w: %w", err, errPoison)
		}
		// Remove idempotent (0 row → nil ở repo) nên redelivery/event trùng an toàn.
		if err := c.memberRepo.Remove(ctx, evt.WorkspaceId, evt.UserId); err != nil {
			return fmt.Errorf("remove member projection: %w", err)
		}
		c.logger.Info("projected member.removed",
			slog.Int64("workspace_id", evt.WorkspaceId), slog.Int64("user_id", evt.UserId))

	default:
		// project.created + event khác page không quan tâm → bỏ qua (vẫn commit để
		// offset tiến, không kẹt topic).
		c.logger.Debug("ignore workspace event", slog.String("event_type", env.EventType))
	}
	return nil
}

// handleUserEvent xử lý auth.user.events. Topic này là RAW pmv1.UserCreatedEvent
// (KHÔNG bọc EventEnvelope — do auth-service phát trực tiếp) → unmarshal thẳng rồi
// upsert users_projection (idempotent). Sai schema → errPoison (skip + commit).
func (c *Consumer) handleUserEvent(ctx context.Context, msg kafka.Message) error {
	var evt pmv1.UserCreatedEvent
	if err := proto.Unmarshal(msg.Value, &evt); err != nil {
		return fmt.Errorf("unmarshal UserCreatedEvent: %w: %w", err, errPoison)
	}
	user := &model.UserProjection{
		ID:        evt.UserId,
		Email:     evt.Email,
		Name:      evt.Name,
		AvatarURL: evt.AvatarUrl,
	}
	if err := c.userRepo.Upsert(ctx, user); err != nil {
		return fmt.Errorf("upsert user projection: %w", err)
	}
	c.logger.Info("projected user.created", slog.Int64("user_id", evt.UserId))
	return nil
}
