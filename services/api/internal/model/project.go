package model

import "time"

// Project là struct đại diện cho 1 project trong database
// Giống như TypeScript interface: interface Project { id: string; name: string; ... }
// Nhưng Go struct = vừa define kiểu dữ liệu, vừa chứa data (JS object + TS type gộp lại)
type Project struct {
	ID        string     `json:"id"`         // ID duy nhất của project
	Name      string     `json:"name"`       // Tên project
	GitURL    string     `json:"git_url"`    // URL repo git (GitHub, GitLab...)
	Branch    string     `json:"branch"`     // Branch để deploy (main, master...)
	Status    string     `json:"status"`     // Trạng thái: pending, building, deployed, failed
	CreatedAt time.Time  `json:"created_at"` // Thời gian tạo - time.Time = luôn có giá trị, không thể nil
	UpdatedAt time.Time  `json:"updated_at"` // Thời gian cập nhật - time.Time = luôn có giá trị
	DeletedAt *time.Time `json:"deleted_at"` // Soft delete - *time.Time = POINTER, có thể nil (chưa xóa = nil)
	// Lưu ý: *time.Time (pointer) vs time.Time (value)
	// - time.Time: luôn có giá trị (zero value = "0001-01-01"), KHÔNG THỂ nil
	// - *time.Time: pointer, CÓ THỂ nil → dùng cho trường hợp "chưa có giá trị" (soft delete)
}
