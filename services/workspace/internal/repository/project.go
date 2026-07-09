package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/workspace/internal/model"
)

// ProjectRepository: truy vấn bảng workspace.projects (thuộc 1 workspace, soft delete).
type ProjectRepository interface {
	Create(ctx context.Context, project *model.Project) error
	ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Project, error)
}

type postgreProjectRepository struct {
	db *sql.DB
}

func NewProjectRepository(db *sql.DB) ProjectRepository {
	return &postgreProjectRepository{db: db}
}

func (r *postgreProjectRepository) Create(ctx context.Context, project *model.Project) error {
	query := `
        INSERT INTO workspace.projects (workspace_id, key, name, lead_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		project.WorkspaceID, project.Key, project.Name, project.LeadID,
	).Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert project: %w", err)
	}
	return nil
}

func (r *postgreProjectRepository) ListByWorkspace(ctx context.Context, workspaceID int64) ([]*model.Project, error) {
	// Lọc deleted_at IS NULL để bỏ project đã soft delete.
	query := `
        SELECT id, workspace_id, key, name, lead_id, created_at, updated_at, deleted_at
        FROM workspace.projects
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("list projects by workspace: %w", err)
	}
	defer rows.Close()

	var projects []*model.Project
	for rows.Next() {
		p := &model.Project{}
		if err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.Key, &p.Name, &p.LeadID,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan project: %w", err)
		}
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate projects: %w", err)
	}
	return projects, nil
}
