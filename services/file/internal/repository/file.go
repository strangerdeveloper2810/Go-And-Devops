package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/file/internal/model"
)

// FileRepository: truy vấn bảng file.files (metadata object lưu trên MinIO).
// Soft delete qua deleted_at → mọi query đọc phải lọc deleted_at IS NULL.
// Authz theo owner_id (file-service không có bảng ACL riêng ở MVP).
type FileRepository interface {
	Create(ctx context.Context, f *model.File) error
	GetByID(ctx context.Context, id int64) (*model.File, error)
	ListByOwner(ctx context.Context, ownerID int64) ([]*model.File, error)
	SoftDelete(ctx context.Context, id int64) error
}

type postgreFileRepository struct {
	db *sql.DB
}

func NewFileRepository(db *sql.DB) FileRepository {
	return &postgreFileRepository{db: db}
}

func (r *postgreFileRepository) Create(ctx context.Context, f *model.File) error {
	query := `
        INSERT INTO file.files (owner_id, workspace_id, name, mime, size, s3_key, s3_bucket, etag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at`

	// WorkspaceID là *int64 nullable → nil sẽ vào DB thành NULL.
	// RETURNING lấy lại id + created_at do DB sinh, gán ngược vào struct.
	err := r.db.QueryRowContext(ctx, query,
		f.OwnerID, f.WorkspaceID, f.Name, f.Mime, f.Size, f.S3Key, f.S3Bucket, f.ETag,
	).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert file: %w", err)
	}
	return nil
}

func (r *postgreFileRepository) GetByID(ctx context.Context, id int64) (*model.File, error) {
	query := `
        SELECT id, owner_id, workspace_id, name, mime, size, s3_key, s3_bucket, etag, created_at, deleted_at
        FROM file.files
        WHERE id = $1 AND deleted_at IS NULL`

	f := &model.File{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&f.ID, &f.OwnerID, &f.WorkspaceID, &f.Name, &f.Mime, &f.Size,
		&f.S3Key, &f.S3Bucket, &f.ETag, &f.CreatedAt, &f.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file not found: %w", err)
		}
		return nil, fmt.Errorf("get file by id: %w", err)
	}
	return f, nil
}

func (r *postgreFileRepository) ListByOwner(ctx context.Context, ownerID int64) ([]*model.File, error) {
	// Chỉ trả file của owner này (authz owner-based) và còn sống (deleted_at IS NULL).
	query := `
        SELECT id, owner_id, workspace_id, name, mime, size, s3_key, s3_bucket, etag, created_at, deleted_at
        FROM file.files
        WHERE owner_id = $1 AND deleted_at IS NULL
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list files by owner: %w", err)
	}
	defer rows.Close()

	var files []*model.File
	for rows.Next() {
		f := &model.File{}
		if err := rows.Scan(
			&f.ID, &f.OwnerID, &f.WorkspaceID, &f.Name, &f.Mime, &f.Size,
			&f.S3Key, &f.S3Bucket, &f.ETag, &f.CreatedAt, &f.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan file: %w", err)
		}
		files = append(files, f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate files: %w", err)
	}
	return files, nil
}

func (r *postgreFileRepository) SoftDelete(ctx context.Context, id int64) error {
	// Soft delete: đánh dấu deleted_at thay vì DELETE thật (bảng files không có
	// cột updated_at). Idempotent-guard bằng IS NULL → xóa lại lần 2 báo not found.
	query := `
        UPDATE file.files
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("soft delete file: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("file %d not found", id)
	}
	return nil
}
