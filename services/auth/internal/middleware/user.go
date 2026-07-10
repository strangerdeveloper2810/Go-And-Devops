package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RequireUser: đọc header X-User-ID (do api-gateway set sau khi verify JWT qua gRPC) →
// set user_id vào gin context. Thiếu/không hợp lệ → 401. Dùng cho các route nội bộ chỉ
// đến được qua gateway đã xác thực (vd user-directory), chống truy cập trực tiếp không auth.
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.GetHeader("X-User-ID")
		id, err := strconv.ParseInt(raw, 10, 64)
		if raw == "" || err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "MISSING_USER", "message": "thiếu hoặc sai header X-User-ID"},
			})
			return
		}
		c.Set("user_id", id)
		c.Next()
	}
}
