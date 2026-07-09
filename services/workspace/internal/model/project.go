package model

import "time"

// Project thuộc về 1 workspace, key duy nhất trong phạm vi workspace. Soft delete.
type Project struct {
	ID          int64  `json:"id"`
	WorkspaceID int64  `json:"workspace_id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	// LeadID nullable → con trỏ (project có thể chưa có lead).
	LeadID    *int64     `json:"lead_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
