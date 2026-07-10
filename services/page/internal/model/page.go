package model

import "time"

// Page = nội dung tài liệu, phân cấp cây qua ParentID (self-reference). slug duy nhất
// trong phạm vi 1 space. Soft delete qua DeletedAt.
type Page struct {
	ID      int64 `json:"id"`
	SpaceID int64 `json:"space_id"`
	// ParentID nullable → con trỏ (NULL = page gốc/root, không có cha).
	ParentID    *int64 `json:"parent_id,omitempty"`
	Title       string `json:"title"`
	Slug        string `json:"slug"`
	ContentHTML string `json:"content_html"`
	ContentText string `json:"content_text"`
	AuthorID    int64  `json:"author_id"`
	Version     int    `json:"version"`
	// TIMESTAMPTZ ↔ time.Time. DeletedAt là *time.Time vì cột nullable.
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
