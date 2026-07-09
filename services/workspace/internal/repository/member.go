package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/workspace/internal/model"
)

// MemberRepository: truy vấn bảng workspace.workspace_members.
// Đọc kèm role name (JOIN roles) để hiển thị mà không cần query thêm.
type MemberRepository interface {
	Add(ctx context.Context, member *model.Member) error
	ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Member, error)
	Get(ctx context.Context, workspaceID, userID int64) (*model.Member, error)
	Remove(ctx context.Context, workspaceID, userID int64) error
}

type postgreMemberRepository struct {
	db *sql.DB
}

func NewMemberRepository(db *sql.DB) MemberRepository {
	return &postgreMemberRepository{db: db}
}

func (r *postgreMemberRepository) Add(ctx context.Context, member *model.Member) error {
	query := `
        INSERT INTO workspace.workspace_members (workspace_id, user_id, role_id)
        VALUES ($1, $2, $3)
        RETURNING id, joined_at`

	err := r.db.QueryRowContext(ctx, query,
		member.WorkspaceID, member.UserID, member.RoleID,
	).Scan(&member.ID, &member.JoinedAt)
	if err != nil {
		return fmt.Errorf("insert member: %w", err)
	}
	return nil
}

func (r *postgreMemberRepository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Member, error) {
	// JOIN roles để lấy role name cho từng member.
	// JOIN workspaces + lọc deleted_at IS NULL: workspace bị soft delete coi như không có member.
	query := `
        SELECT m.id, m.workspace_id, m.user_id, m.role_id, m.joined_at, r.name
        FROM workspace.workspace_members m
        JOIN workspace.roles r ON r.id = m.role_id
        JOIN workspace.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
        WHERE m.workspace_id = $1
        ORDER BY m.id`

	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("list members by workspace: %w", err)
	}
	defer rows.Close()

	var members []*model.Member
	for rows.Next() {
		m := &model.Member{}
		if err := rows.Scan(
			&m.ID, &m.WorkspaceID, &m.UserID, &m.RoleID, &m.JoinedAt, &m.RoleName,
		); err != nil {
			return nil, fmt.Errorf("scan member: %w", err)
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate members: %w", err)
	}
	return members, nil
}

func (r *postgreMemberRepository) Get(ctx context.Context, workspaceID, userID int64) (*model.Member, error) {
	// JOIN workspaces + lọc deleted_at IS NULL: workspace bị soft delete → không còn membership hợp lệ.
	query := `
        SELECT m.id, m.workspace_id, m.user_id, m.role_id, m.joined_at, r.name
        FROM workspace.workspace_members m
        JOIN workspace.roles r ON r.id = m.role_id
        JOIN workspace.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
        WHERE m.workspace_id = $1 AND m.user_id = $2`

	m := &model.Member{}
	err := r.db.QueryRowContext(ctx, query, workspaceID, userID).Scan(
		&m.ID, &m.WorkspaceID, &m.UserID, &m.RoleID, &m.JoinedAt, &m.RoleName,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("member not found: %w", err)
		}
		return nil, fmt.Errorf("get member: %w", err)
	}
	return m, nil
}

func (r *postgreMemberRepository) Remove(ctx context.Context, workspaceID, userID int64) error {
	// Hard delete: bảng nối không cần soft delete (chỉ là liên kết).
	query := `
        DELETE FROM workspace.workspace_members
        WHERE workspace_id = $1 AND user_id = $2`

	result, err := r.db.ExecContext(ctx, query, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("remove member: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("member (workspace %d, user %d) not found", workspaceID, userID)
	}
	return nil
}
