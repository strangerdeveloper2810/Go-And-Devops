package model

import "time"

// File = metadata 1 object lưu trên MinIO/S3. Nội dung nhị phân KHÔNG nằm trong
// Postgres — chỉ giữ con trỏ (S3Bucket + S3Key) tới object. Soft delete qua DeletedAt.
type File struct {
	ID      int64 `json:"id"`
	OwnerID int64 `json:"owner_id"`
	// WorkspaceID nullable → con trỏ (file có thể là file cá nhân, không thuộc workspace).
	WorkspaceID *int64 `json:"workspace_id,omitempty"`
	Name        string `json:"name"`
	Mime        string `json:"mime"`
	Size        int64  `json:"size"`
	S3Key       string `json:"s3_key"`
	S3Bucket    string `json:"s3_bucket"`
	ETag        string `json:"etag"`
	// TIMESTAMPTZ ↔ time.Time. DeletedAt là *time.Time vì cột nullable.
	CreatedAt time.Time  `json:"created_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
