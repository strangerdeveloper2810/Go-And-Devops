package handler

import (
	"github.com/gin-gonic/gin"
)

// Response là format chuẩn cho mọi API response
// Giống như trong Express: res.json({ success: true, data: {...} })
// Nhưng Go cần define struct rõ ràng (JS thì tạo object tự do)
//
// `json:"success"` = json tag, cho biết tên field khi convert sang JSON
// Bắt buộc có dấu ngoặc kép: `json:"success"` ✅  |  `json:success` ❌
type Response struct {
	Success bool   `json:"success"` // true = thành công, false = lỗi
	Data    any    `json:"data"`    // Dữ liệu trả về (any = interface{}, giống 'any' trong TypeScript)
	Error   string `json:"error"`   // Message lỗi (chỉ có khi Success = false)
}

// SuccessResponse gửi response thành công về client
// c *gin.Context = req + res gộp lại (giống Express: req, res → Gin: c)
// c.JSON() = res.json() trong Express
func SuccessResponse(c *gin.Context, statusCode int, data any) {
	response := Response{
		Success: true,
		Data:    data,
	}
	c.JSON(statusCode, response)
}

// ErrorResponse gửi response lỗi về client
// Lưu ý: Error message nằm trong field "Error", KHÔNG PHẢI "Data"
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	response := Response{
		Success: false,
		Error:   message,
	}
	c.JSON(statusCode, response)
}
