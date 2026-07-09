package model

import (
	"encoding/json"
	"time"
)

// Role: system role (WorkspaceID = nil, dùng chung) hoặc custom role gắn workspace.
type Role struct {
	ID          int64  `json:"id"`
	WorkspaceID *int64 `json:"workspace_id,omitempty"` // nil = system role
	Name        string `json:"name"`
	// permissions JSONB → json.RawMessage giữ nguyên bytes, chưa cần parse thành struct.
	Permissions json.RawMessage `json:"permissions"`
	IsSystem    bool            `json:"is_system"`
	CreatedAt   time.Time       `json:"created_at"`
}

// Tên các system role được seed sẵn ở migration.
const (
	RoleOwner  = "owner"
	RoleMember = "member"
)
