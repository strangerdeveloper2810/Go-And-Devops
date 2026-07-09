package model

import "time"

// Space = container chứa pages (kiểu Confluence Space). page-service sở hữu bảng này.
// key duy nhất toàn hệ thống (Jira/Confluence-style). deleted_at là con trỏ vì
// nullable (NULL = còn sống, soft delete).
type Space struct {
	ID          int64  `json:"id"`
	WorkspaceID int64  `json:"workspace_id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	OwnerID     int64  `json:"owner_id"`
	// TIMESTAMPTZ ↔ time.Time. DeletedAt là *time.Time vì cột nullable.
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
