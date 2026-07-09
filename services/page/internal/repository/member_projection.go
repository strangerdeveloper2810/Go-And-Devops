package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/page/internal/model"
)

// MemberProjectionRepo: bảng projection page.members_projection, đồng bộ từ Kafka workspace.events.
// Nguồn authz chính: page-service kiểm tra user có thuộc workspace không qua bảng này.
// Khóa ghép (WorkspaceID, UserID). Ghi bằng Upsert để idempotent, xóa bằng Remove.
type MemberProjectionRepo interface {
	Upsert(ctx context.Context, member *model.MemberProjection) error
	Get(ctx context.Context, workspaceID, userID int64) (*model.MemberProjection, error)
	Remove(ctx context.Context, workspaceID, userID int64) error
}

type postgreMemberProjectionRepo struct {
	db *sql.DB
}

func NewMemberProjectionRepo(db *sql.DB) MemberProjectionRepo {
	return &postgreMemberProjectionRepo{db: db}
}

func (r *postgreMemberProjectionRepo) Upsert(ctx context.Context, member *model.MemberProjection) error {
	// ON CONFLICT(workspace_id, user_id) DO UPDATE: đã có membership thì cập nhật role, chưa thì insert.
	// Idempotent — consumer Kafka có thể nhận trùng event mà không lỗi.
	query := `
        INSERT INTO page.members_projection (workspace_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (workspace_id, user_id) DO UPDATE
        SET role = EXCLUDED.role`

	_, err := r.db.ExecContext(ctx, query, member.WorkspaceID, member.UserID, member.Role)
	if err != nil {
		return fmt.Errorf("upsert member projection: %w", err)
	}
	return nil
}

func (r *postgreMemberProjectionRepo) Get(ctx context.Context, workspaceID, userID int64) (*model.MemberProjection, error) {
	query := `
        SELECT workspace_id, user_id, role
        FROM page.members_projection
        WHERE workspace_id = $1 AND user_id = $2`

	m := &model.MemberProjection{}
	err := r.db.QueryRowContext(ctx, query, workspaceID, userID).Scan(
		&m.WorkspaceID, &m.UserID, &m.Role,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("member projection not found: %w", err)
		}
		return nil, fmt.Errorf("get member projection: %w", err)
	}
	return m, nil
}

func (r *postgreMemberProjectionRepo) Remove(ctx context.Context, workspaceID, userID int64) error {
	// Hard delete: projection membership bị thu hồi (event member.removed) → xóa hẳn dòng.
	query := `
        DELETE FROM page.members_projection
        WHERE workspace_id = $1 AND user_id = $2`

	// 0 row = membership đã bị xóa trước đó (event member.removed trùng/redelivery).
	// Consumer chạy at-least-once + retry-on-error nên Remove PHẢI idempotent: coi
	// như thành công (không trả lỗi) để không kẹt retry vô hạn ở message đã áp dụng.
	if _, err := r.db.ExecContext(ctx, query, workspaceID, userID); err != nil {
		return fmt.Errorf("remove member projection: %w", err)
	}
	return nil
}
