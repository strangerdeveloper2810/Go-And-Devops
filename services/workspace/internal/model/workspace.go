package model

import "time"

// Workspace = tenant. deleted_at là con trỏ vì nullable (NULL = còn sống, soft delete).
type Workspace struct {
	ID      int64  `json:"id"`
	Slug    string `json:"slug"`
	Name    string `json:"name"`
	OwnerID int64  `json:"owner_id"`
	Plan    string `json:"plan"`
	// TIMESTAMPTZ ↔ time.Time. DeletedAt là *time.Time vì cột nullable.
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// Các gói (plan) workspace hỗ trợ.
const (
	WorkspacePlanFree = "free"
	WorkspacePlanPro  = "pro"
	WorkspacePlanTeam = "team"
)
