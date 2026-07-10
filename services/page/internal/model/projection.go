package model

// Các struct projection = bản đọc (read-model) dựng từ Kafka events, KHÔNG phải nguồn gốc.
// page-service dùng chúng để authz (membership) + hiển thị, tránh gọi đồng bộ sang service khác.

// WorkspaceProjection = bản projection workspace đọc từ Kafka (workspace.events).
// ID chính là workspace id ở workspace-service (không serial ở đây).
type WorkspaceProjection struct {
	ID   int64  `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

// MemberProjection = bản projection quyền thành viên (workspace.events).
// Nguồn authz chính: kiểm tra user có thuộc workspace không. Khóa ghép (WorkspaceID, UserID).
type MemberProjection struct {
	WorkspaceID int64  `json:"workspace_id"`
	UserID      int64  `json:"user_id"`
	Role        string `json:"role"`
}

// UserProjection = bản projection user đọc từ Kafka (auth.user.events).
// ID chính là auth user id đẩy sang (không serial ở service này).
type UserProjection struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}
