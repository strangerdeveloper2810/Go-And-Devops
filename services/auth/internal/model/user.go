package model

import "time"

type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"password_hash"`
	Name         string `json:"name"`
	AvatarURL    string `json:"avatar_url"`
	Status       string `json:"status"`
	// TIMESTAMPTZ trong DB → time.Time trong Go (không phải int64).
	// Scan tự map timestamptz ↔ time.Time; dùng int64 sẽ lỗi kiểu.
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const (
	UserStatusActive   = "active"
	UserStatusInactive = "inactive"
	UserStatusInvited  = "invited"
	UserStatusMigrated = "migrated"
)
