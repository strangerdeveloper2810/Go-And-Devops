package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/workspace/internal/model"
)

// RoleRepository: truy vấn bảng workspace.roles.
// System role có workspace_id NULL (dùng chung); custom role gắn 1 workspace.
type RoleRepository interface {
	ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Role, error)
	GetByName(ctx context.Context, name string) (*model.Role, error)
}

type postgreRoleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) RoleRepository {
	return &postgreRoleRepository{db: db}
}

func (r *postgreRoleRepository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Role, error) {
	// Trả cả system role (workspace_id IS NULL) lẫn custom role của workspace này.
	query := `
        SELECT id, workspace_id, name, permissions, is_system, created_at
        FROM workspace.roles
        WHERE workspace_id IS NULL OR workspace_id = $1
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("list roles by workspace: %w", err)
	}
	defer rows.Close()

	var roles []*model.Role
	for rows.Next() {
		role := &model.Role{}
		if err := rows.Scan(
			&role.ID, &role.WorkspaceID, &role.Name,
			&role.Permissions, &role.IsSystem, &role.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}
	return roles, nil
}

func (r *postgreRoleRepository) GetByName(ctx context.Context, name string) (*model.Role, error) {
	// Dùng để tra system role ('owner'/'member') theo tên khi thêm member.
	// Chỉ tìm system role (workspace_id IS NULL) → tên duy nhất.
	query := `
        SELECT id, workspace_id, name, permissions, is_system, created_at
        FROM workspace.roles
        WHERE name = $1 AND workspace_id IS NULL`

	role := &model.Role{}
	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&role.ID, &role.WorkspaceID, &role.Name,
		&role.Permissions, &role.IsSystem, &role.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role not found: %w", err)
		}
		return nil, fmt.Errorf("get role by name: %w", err)
	}
	return role, nil
}
