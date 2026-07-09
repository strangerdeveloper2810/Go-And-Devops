package model

import "time"

// Member = bản ghi bảng nối workspace_members (user thuộc workspace với 1 role).
type Member struct {
	ID          int64     `json:"id"`
	WorkspaceID int64     `json:"workspace_id"`
	UserID      int64     `json:"user_id"`
	RoleID      int64     `json:"role_id"`
	JoinedAt    time.Time `json:"joined_at"`
	// RoleName join từ bảng roles cho tiện hiển thị (không map cột trực tiếp).
	RoleName string `json:"role,omitempty"`
}
