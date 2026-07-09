package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/page/internal/model"
)

// WorkspaceProjectionRepo: bảng projection page.workspaces_projection, đồng bộ từ Kafka workspace.events.
// Không tự sinh id — id chính là workspace id ở workspace-service. Ghi bằng Upsert để idempotent.
type WorkspaceProjectionRepo interface {
	Upsert(ctx context.Context, ws *model.WorkspaceProjection) error
	GetByID(ctx context.Context, id int64) (*model.WorkspaceProjection, error)
}

type postgreWorkspaceProjectionRepo struct {
	db *sql.DB
}

func NewWorkspaceProjectionRepo(db *sql.DB) WorkspaceProjectionRepo {
	return &postgreWorkspaceProjectionRepo{db: db}
}

func (r *postgreWorkspaceProjectionRepo) Upsert(ctx context.Context, ws *model.WorkspaceProjection) error {
	// ON CONFLICT(id) DO UPDATE: nếu workspace đã tồn tại thì cập nhật, chưa thì insert.
	// Idempotent — consumer Kafka có thể nhận trùng event mà không lỗi.
	query := `
        INSERT INTO page.workspaces_projection (id, slug, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
        SET slug = EXCLUDED.slug,
            name = EXCLUDED.name`

	_, err := r.db.ExecContext(ctx, query, ws.ID, ws.Slug, ws.Name)
	if err != nil {
		return fmt.Errorf("upsert workspace projection: %w", err)
	}
	return nil
}

func (r *postgreWorkspaceProjectionRepo) GetByID(ctx context.Context, id int64) (*model.WorkspaceProjection, error) {
	query := `
        SELECT id, slug, name
        FROM page.workspaces_projection
        WHERE id = $1`

	ws := &model.WorkspaceProjection{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&ws.ID, &ws.Slug, &ws.Name,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("workspace projection not found: %w", err)
		}
		return nil, fmt.Errorf("get workspace projection by id: %w", err)
	}
	return ws, nil
}
