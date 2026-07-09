package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/workspace/internal/model"
)

// WorkspaceRepository: truy vấn bảng workspace.workspaces.
// Soft delete qua deleted_at → mọi query đọc phải lọc deleted_at IS NULL.
type WorkspaceRepository interface {
	Create(ctx context.Context, ws *model.Workspace) error
	GetByID(ctx context.Context, id int64) (*model.Workspace, error)
	GetBySlug(ctx context.Context, slug string) (*model.Workspace, error)
	ListByMember(ctx context.Context, userID int64) ([]*model.Workspace, error)
	Update(ctx context.Context, ws *model.Workspace) error
	SoftDelete(ctx context.Context, id int64) error
}

type postgreWorkspaceRepository struct {
	db *sql.DB
}

func NewWorkspaceRepository(db *sql.DB) WorkspaceRepository {
	return &postgreWorkspaceRepository{db: db}
}

func (r *postgreWorkspaceRepository) Create(ctx context.Context, ws *model.Workspace) error {
	query := `
        INSERT INTO workspace.workspaces (slug, name, owner_id, plan)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, updated_at`

	// RETURNING lấy lại id + timestamp do DB sinh, gán ngược vào struct.
	err := r.db.QueryRowContext(ctx, query,
		ws.Slug, ws.Name, ws.OwnerID, ws.Plan,
	).Scan(&ws.ID, &ws.CreatedAt, &ws.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert workspace: %w", err)
	}
	return nil
}

func (r *postgreWorkspaceRepository) GetByID(ctx context.Context, id int64) (*model.Workspace, error) {
	query := `
        SELECT id, slug, name, owner_id, plan, created_at, updated_at, deleted_at
        FROM workspace.workspaces
        WHERE id = $1 AND deleted_at IS NULL`

	ws := &model.Workspace{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&ws.ID, &ws.Slug, &ws.Name, &ws.OwnerID, &ws.Plan,
		&ws.CreatedAt, &ws.UpdatedAt, &ws.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("workspace not found: %w", err)
		}
		return nil, fmt.Errorf("get workspace by id: %w", err)
	}
	return ws, nil
}

func (r *postgreWorkspaceRepository) GetBySlug(ctx context.Context, slug string) (*model.Workspace, error) {
	query := `
        SELECT id, slug, name, owner_id, plan, created_at, updated_at, deleted_at
        FROM workspace.workspaces
        WHERE slug = $1 AND deleted_at IS NULL`

	ws := &model.Workspace{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&ws.ID, &ws.Slug, &ws.Name, &ws.OwnerID, &ws.Plan,
		&ws.CreatedAt, &ws.UpdatedAt, &ws.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("workspace not found: %w", err)
		}
		return nil, fmt.Errorf("get workspace by slug: %w", err)
	}
	return ws, nil
}

func (r *postgreWorkspaceRepository) ListByMember(ctx context.Context, userID int64) ([]*model.Workspace, error) {
	// JOIN workspace_members: chỉ trả workspace mà userID là thành viên.
	query := `
        SELECT w.id, w.slug, w.name, w.owner_id, w.plan, w.created_at, w.updated_at, w.deleted_at
        FROM workspace.workspaces w
        JOIN workspace.workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = $1 AND w.deleted_at IS NULL
        ORDER BY w.id`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list workspaces by member: %w", err)
	}
	defer rows.Close()

	var workspaces []*model.Workspace
	for rows.Next() {
		ws := &model.Workspace{}
		if err := rows.Scan(
			&ws.ID, &ws.Slug, &ws.Name, &ws.OwnerID, &ws.Plan,
			&ws.CreatedAt, &ws.UpdatedAt, &ws.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan workspace: %w", err)
		}
		workspaces = append(workspaces, ws)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workspaces: %w", err)
	}
	return workspaces, nil
}

func (r *postgreWorkspaceRepository) Update(ctx context.Context, ws *model.Workspace) error {
	// Chỉ cho phép sửa name/plan; updated_at tự bump. RETURNING để đồng bộ struct.
	query := `
        UPDATE workspace.workspaces
        SET name = $1, plan = $2, updated_at = NOW()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING updated_at`

	err := r.db.QueryRowContext(ctx, query, ws.Name, ws.Plan, ws.ID).Scan(&ws.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("workspace not found: %w", err)
		}
		return fmt.Errorf("update workspace: %w", err)
	}
	return nil
}

func (r *postgreWorkspaceRepository) SoftDelete(ctx context.Context, id int64) error {
	// Soft delete: đánh dấu deleted_at thay vì DELETE thật. Idempotent-guard bằng IS NULL.
	query := `
        UPDATE workspace.workspaces
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("soft delete workspace: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("workspace %d not found", id)
	}
	return nil
}
