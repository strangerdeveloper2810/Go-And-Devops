package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/page/internal/model"
)

// SpaceRepository: truy vấn bảng page.spaces (page-service SỞ HỮU spaces).
// key duy nhất TOÀN HỆ THỐNG (Jira/Confluence-style). Soft delete qua deleted_at
// → mọi query đọc phải lọc deleted_at IS NULL.
type SpaceRepository interface {
	Create(ctx context.Context, space *model.Space) error
	GetByID(ctx context.Context, id int64) (*model.Space, error)
	ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Space, error)
	// ExistsByKey: key đã bị space CÒN SỐNG nào (TOÀN HỆ THỐNG) chiếm chưa.
	// Space key phải global-unique kiểu Confluence → tránh nhập nhằng cross-workspace.
	ExistsByKey(ctx context.Context, key string) (bool, error)
	Update(ctx context.Context, space *model.Space) error
	SoftDelete(ctx context.Context, id int64) error
}

type postgreSpaceRepository struct {
	db *sql.DB
}

func NewSpaceRepository(db *sql.DB) SpaceRepository {
	return &postgreSpaceRepository{db: db}
}

func (r *postgreSpaceRepository) Create(ctx context.Context, space *model.Space) error {
	query := `
        INSERT INTO page.spaces (workspace_id, key, name, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, updated_at`

	// RETURNING lấy lại id + timestamp do DB sinh, gán ngược vào struct.
	err := r.db.QueryRowContext(ctx, query,
		space.WorkspaceID, space.Key, space.Name, space.OwnerID,
	).Scan(&space.ID, &space.CreatedAt, &space.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert space: %w", err)
	}
	return nil
}

func (r *postgreSpaceRepository) GetByID(ctx context.Context, id int64) (*model.Space, error) {
	query := `
        SELECT id, workspace_id, key, name, owner_id, created_at, updated_at, deleted_at
        FROM page.spaces
        WHERE id = $1 AND deleted_at IS NULL`

	space := &model.Space{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&space.ID, &space.WorkspaceID, &space.Key, &space.Name, &space.OwnerID,
		&space.CreatedAt, &space.UpdatedAt, &space.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("space not found: %w", err)
		}
		return nil, fmt.Errorf("get space by id: %w", err)
	}
	return space, nil
}

func (r *postgreSpaceRepository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Space, error) {
	// Lọc deleted_at IS NULL để bỏ space đã soft delete.
	query := `
        SELECT id, workspace_id, key, name, owner_id, created_at, updated_at, deleted_at
        FROM page.spaces
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("list spaces by workspace: %w", err)
	}
	defer rows.Close()

	var spaces []*model.Space
	for rows.Next() {
		s := &model.Space{}
		if err := rows.Scan(
			&s.ID, &s.WorkspaceID, &s.Key, &s.Name, &s.OwnerID,
			&s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan space: %w", err)
		}
		spaces = append(spaces, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate spaces: %w", err)
	}
	return spaces, nil
}

// ExistsByKey: có space CÒN SỐNG nào (bất kỳ workspace) dùng key này chưa.
func (r *postgreSpaceRepository) ExistsByKey(ctx context.Context, key string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM page.spaces WHERE key = $1 AND deleted_at IS NULL)`,
		key,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check space key exists: %w", err)
	}
	return exists, nil
}

func (r *postgreSpaceRepository) Update(ctx context.Context, space *model.Space) error {
	// Chỉ cho phép sửa name; key immutable (global-unique). updated_at tự bump. RETURNING để đồng bộ struct.
	query := `
        UPDATE page.spaces
        SET name = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING updated_at`

	err := r.db.QueryRowContext(ctx, query, space.Name, space.ID).Scan(&space.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("space not found: %w", err)
		}
		return fmt.Errorf("update space: %w", err)
	}
	return nil
}

func (r *postgreSpaceRepository) SoftDelete(ctx context.Context, id int64) error {
	// Soft delete: đánh dấu deleted_at thay vì DELETE thật. Idempotent-guard bằng IS NULL.
	query := `
        UPDATE page.spaces
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("soft delete space: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("space %d not found", id)
	}
	return nil
}
