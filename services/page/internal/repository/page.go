package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/page/internal/model"
)

// PageRepository: truy vấn bảng page.pages (thuộc 1 space, phân cấp cây qua parent_id, soft delete).
// slug duy nhất trong phạm vi 1 space. version tăng optimistic mỗi lần Update.
type PageRepository interface {
	Create(ctx context.Context, page *model.Page) error
	GetByID(ctx context.Context, id int64) (*model.Page, error)
	ListBySpace(ctx context.Context, spaceID int64) ([]*model.Page, error)
	ListChildren(ctx context.Context, parentID int64) ([]*model.Page, error)
	// ExistsBySpaceAndSlug: slug đã bị page CÒN SỐNG nào TRONG CÙNG SPACE chiếm chưa.
	// URL /space/<key>/<slug> không được trùng trong 1 space.
	ExistsBySpaceAndSlug(ctx context.Context, spaceID int64, slug string) (bool, error)
	Update(ctx context.Context, page *model.Page) error
	SoftDelete(ctx context.Context, id int64) error
}

type postgrePageRepository struct {
	db *sql.DB
}

func NewPageRepository(db *sql.DB) PageRepository {
	return &postgrePageRepository{db: db}
}

func (r *postgrePageRepository) Create(ctx context.Context, page *model.Page) error {
	query := `
        INSERT INTO page.pages (space_id, parent_id, title, slug, content_html, content_text, author_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, version, created_at, updated_at`

	// RETURNING lấy lại id + version (DEFAULT 1) + timestamp do DB sinh, gán ngược vào struct.
	err := r.db.QueryRowContext(ctx, query,
		page.SpaceID, page.ParentID, page.Title, page.Slug,
		page.ContentHTML, page.ContentText, page.AuthorID,
	).Scan(&page.ID, &page.Version, &page.CreatedAt, &page.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert page: %w", err)
	}
	return nil
}

func (r *postgrePageRepository) GetByID(ctx context.Context, id int64) (*model.Page, error) {
	query := `
        SELECT id, space_id, parent_id, title, slug, content_html, content_text, author_id, version, created_at, updated_at, deleted_at
        FROM page.pages
        WHERE id = $1 AND deleted_at IS NULL`

	p := &model.Page{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.SpaceID, &p.ParentID, &p.Title, &p.Slug,
		&p.ContentHTML, &p.ContentText, &p.AuthorID, &p.Version,
		&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("page not found: %w", err)
		}
		return nil, fmt.Errorf("get page by id: %w", err)
	}
	return p, nil
}

func (r *postgrePageRepository) ListBySpace(ctx context.Context, spaceID int64) ([]*model.Page, error) {
	// Lọc deleted_at IS NULL để bỏ page đã soft delete.
	query := `
        SELECT id, space_id, parent_id, title, slug, content_html, content_text, author_id, version, created_at, updated_at, deleted_at
        FROM page.pages
        WHERE space_id = $1 AND deleted_at IS NULL
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, spaceID)
	if err != nil {
		return nil, fmt.Errorf("list pages by space: %w", err)
	}
	defer rows.Close()

	var pages []*model.Page
	for rows.Next() {
		p := &model.Page{}
		if err := rows.Scan(
			&p.ID, &p.SpaceID, &p.ParentID, &p.Title, &p.Slug,
			&p.ContentHTML, &p.ContentText, &p.AuthorID, &p.Version,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan page: %w", err)
		}
		pages = append(pages, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pages: %w", err)
	}
	return pages, nil
}

func (r *postgrePageRepository) ListChildren(ctx context.Context, parentID int64) ([]*model.Page, error) {
	// Con trực tiếp của 1 page (parent_id = $1). Lọc deleted_at IS NULL để bỏ page đã soft delete.
	query := `
        SELECT id, space_id, parent_id, title, slug, content_html, content_text, author_id, version, created_at, updated_at, deleted_at
        FROM page.pages
        WHERE parent_id = $1 AND deleted_at IS NULL
        ORDER BY id`

	rows, err := r.db.QueryContext(ctx, query, parentID)
	if err != nil {
		return nil, fmt.Errorf("list children pages: %w", err)
	}
	defer rows.Close()

	var pages []*model.Page
	for rows.Next() {
		p := &model.Page{}
		if err := rows.Scan(
			&p.ID, &p.SpaceID, &p.ParentID, &p.Title, &p.Slug,
			&p.ContentHTML, &p.ContentText, &p.AuthorID, &p.Version,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan page: %w", err)
		}
		pages = append(pages, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pages: %w", err)
	}
	return pages, nil
}

// ExistsBySpaceAndSlug: có page CÒN SỐNG nào trong space này dùng slug này chưa.
func (r *postgrePageRepository) ExistsBySpaceAndSlug(ctx context.Context, spaceID int64, slug string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM page.pages WHERE space_id = $1 AND slug = $2 AND deleted_at IS NULL)`,
		spaceID, slug,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check page slug exists: %w", err)
	}
	return exists, nil
}

func (r *postgrePageRepository) Update(ctx context.Context, page *model.Page) error {
	// Sửa nội dung + di chuyển vị trí (parent_id, slug). version tăng optimistic mỗi lần sửa.
	// updated_at tự bump. RETURNING version + updated_at để đồng bộ struct.
	query := `
        UPDATE page.pages
        SET title = $1, slug = $2, content_html = $3, content_text = $4, parent_id = $5,
            version = version + 1, updated_at = NOW()
        WHERE id = $6 AND deleted_at IS NULL
        RETURNING version, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		page.Title, page.Slug, page.ContentHTML, page.ContentText, page.ParentID, page.ID,
	).Scan(&page.Version, &page.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("page not found: %w", err)
		}
		return fmt.Errorf("update page: %w", err)
	}
	return nil
}

func (r *postgrePageRepository) SoftDelete(ctx context.Context, id int64) error {
	// Soft delete: đánh dấu deleted_at thay vì DELETE thật. Idempotent-guard bằng IS NULL.
	query := `
        UPDATE page.pages
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("soft delete page: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("page %d not found", id)
	}
	return nil
}
