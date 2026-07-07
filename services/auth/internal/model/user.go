package model

type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"password_hash"`
	Name         string `json:"name"`
	AvatarURL    string `json:"avatar_url"`
	Status       string `json:"status"`
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

const (
	UserStatusActive   = "active"
	UserStatusInactive = "inactive"
	UserStatusInvited  = "invited"
	UserStatusMigrated = "migrated"
)
