package model

import "time"

// User = bản projection đọc từ Kafka (auth.user.events).
// ID chính là auth user id (không phải serial ở service này).
type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}
