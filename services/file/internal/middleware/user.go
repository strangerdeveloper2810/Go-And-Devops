package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	// HeaderUserID là header gateway inject sau khi verify JWT.
	// File-service tin tưởng header này (chạy trong internal network sau gateway).
	HeaderUserID = "X-User-ID"
	// HeaderUserEmail đi kèm HeaderUserID (email của caller).
	HeaderUserEmail = "X-User-Email"
	// CtxKeyUserID là key lưu user id (int64) trong gin.Context.
	CtxKeyUserID = "user_id"
)

// RequireUser đọc X-User-ID do gateway inject, parse ra int64 rồi set vào context.
// Thiếu header hoặc parse fail → 401 (code MISSING_USER). File-service không bao giờ
// thấy raw JWT — chỉ tin header từ gateway.
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.GetHeader(HeaderUserID)
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "MISSING_USER", "message": "missing X-User-ID header"},
			})
			return
		}
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "MISSING_USER", "message": "invalid X-User-ID header"},
			})
			return
		}
		c.Set(CtxKeyUserID, id)
		c.Next()
	}
}

// UserID lấy user id (int64) đã được RequireUser set vào context.
// Trả 0 nếu chưa set (không nên xảy ra khi route đã gắn RequireUser).
func UserID(c *gin.Context) int64 {
	v, ok := c.Get(CtxKeyUserID)
	if !ok {
		return 0
	}
	id, _ := v.(int64)
	return id
}
