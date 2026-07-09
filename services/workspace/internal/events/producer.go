// Package events chứa Kafka producer + consumer cho workspace-service.
//
// Producer phát domain event lên topic workspace.events để các service khác
// (issue) dựng read-model projection mà KHÔNG cần gọi workspace trực tiếp —
// kiến trúc event-driven, loose coupling. Mỗi event được bọc trong common
// EventEnvelope: EventType để consumer dispatch, Payload = message cụ thể đã
// marshal. Consumer parse EventEnvelope.parseFrom(value) rồi parse tiếp payload
// theo EventType.
package events

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/model"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Event type strings — consumer dispatch dựa trên EventEnvelope.EventType.
const (
	eventTypeWorkspaceCreated = "workspace.created"
	eventTypeProjectCreated   = "project.created"
	eventTypeMemberAdded      = "member.added"
	eventTypeMemberRemoved    = "member.removed"
)

// Producer bọc *kafka.Writer để phát event lên topic workspace.events.
// Balancer Hash → cùng key (workspace_id) luôn vào cùng partition → giữ thứ tự
// event trong phạm vi 1 workspace.
type Producer struct {
	writer *kafka.Writer
	logger *slog.Logger
}

func NewProducer(cfg config.KafkaConfig, logger *slog.Logger) *Producer {
	w := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Brokers...),
		Topic:    cfg.WorkspaceEventsTopic,
		Balancer: &kafka.Hash{},
	}
	return &Producer{writer: w, logger: logger}
}

// PublishWorkspaceCreated phát event khi có workspace mới (actor = owner).
func (p *Producer) PublishWorkspaceCreated(ctx context.Context, ws *model.Workspace) {
	evt := &pmv1.WorkspaceCreatedEvent{
		WorkspaceId: ws.ID,
		Slug:        ws.Slug,
		Name:        ws.Name,
		OwnerId:     ws.OwnerID,
	}
	p.publish(ctx, eventTypeWorkspaceCreated, ws.ID, ws.OwnerID, evt)
}

// PublishProjectCreated phát event khi có project mới (actor = người tạo).
func (p *Producer) PublishProjectCreated(ctx context.Context, actorID int64, proj *model.Project) {
	// LeadID nullable (*int64) → 0 khi chưa gán, khớp convention proto (0 = unset).
	var leadID int64
	if proj.LeadID != nil {
		leadID = *proj.LeadID
	}
	evt := &pmv1.ProjectCreatedEvent{
		ProjectId:   proj.ID,
		WorkspaceId: proj.WorkspaceID,
		Key:         proj.Key,
		Name:        proj.Name,
		LeadId:      leadID,
	}
	p.publish(ctx, eventTypeProjectCreated, proj.WorkspaceID, actorID, evt)
}

// PublishMemberAdded phát event khi thêm thành viên vào workspace.
func (p *Producer) PublishMemberAdded(ctx context.Context, actorID, workspaceID, userID int64, role string) {
	evt := &pmv1.MemberAddedEvent{
		WorkspaceId: workspaceID,
		UserId:      userID,
		Role:        role,
	}
	p.publish(ctx, eventTypeMemberAdded, workspaceID, actorID, evt)
}

// PublishMemberRemoved phát event khi gỡ thành viên khỏi workspace.
func (p *Producer) PublishMemberRemoved(ctx context.Context, actorID, workspaceID, userID int64) {
	evt := &pmv1.MemberRemovedEvent{
		WorkspaceId: workspaceID,
		UserId:      userID,
	}
	p.publish(ctx, eventTypeMemberRemoved, workspaceID, actorID, evt)
}

// publish bọc payload cụ thể vào EventEnvelope rồi ghi lên Kafka. BEST-EFFORT
// (at-least-once): mọi lỗi chỉ được LOG, KHÔNG trả về — thao tác DB đã commit
// xong, không được để lỗi Kafka làm hỏng flow của người dùng.
func (p *Producer) publish(ctx context.Context, eventType string, workspaceID, actorID int64, payload proto.Message) {
	payloadBytes, err := proto.Marshal(payload)
	if err != nil {
		p.logger.Error("marshal event payload",
			slog.String("event_type", eventType), slog.Any("err", err))
		return
	}

	env := &pmv1.EventEnvelope{
		EventType:   eventType,
		WorkspaceId: workspaceID,
		ActorId:     actorID,
		OccurredAt:  timestamppb.New(time.Now()),
		Payload:     payloadBytes,
	}
	value, err := proto.Marshal(env)
	if err != nil {
		p.logger.Error("marshal event envelope",
			slog.String("event_type", eventType), slog.Any("err", err))
		return
	}

	// Key = workspace_id → partitioning (Hash balancer) + idempotency phía consumer.
	key := []byte(strconv.FormatInt(workspaceID, 10))
	if err := p.writer.WriteMessages(ctx, kafka.Message{Key: key, Value: value}); err != nil {
		p.logger.Error("publish workspace event",
			slog.String("event_type", eventType),
			slog.Any("err", err),
			slog.Int64("workspace_id", workspaceID))
		return
	}
	p.logger.Info("published workspace event",
		slog.String("event_type", eventType),
		slog.Int64("workspace_id", workspaceID))
}

// Close đóng writer (flush message còn đọng) khi service shutdown.
func (p *Producer) Close() error {
	return p.writer.Close()
}
