package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pmv1 "github.com/pm-platform/proto-go/pm/v1"
)

// JWTAuth verify Bearer token bằng cách GỌI auth-service gRPC VerifyToken,
// thay vì tự parse JWT. Lý do: auth-service là single source of truth về
// user state (active/banned) và giữ secret ở một nơi duy nhất.
//
// authAddr = địa chỉ gRPC của auth-service (vd "localhost:9001").
func JWTAuth(authAddr string) gin.HandlerFunc {
	// Tạo gRPC client 1 lần khi khởi tạo middleware (dùng lại cho mọi request).
	// grpc.NewClient là lazy: không kết nối ngay, kết nối ở request đầu tiên.
	conn, err := grpc.NewClient(authAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()), // dev: không TLS
	)
	if err != nil {
		// Fail closed: không tạo được client → từ chối MỌI request (an toàn hơn
		// là cho qua). Trả về middleware luôn chặn.
		return func(c *gin.Context) {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": gin.H{
					"code":    "AUTH_SERVICE_UNAVAILABLE",
					"message": "authentication service is not available",
				},
			})
		}
	}

	client := pmv1.NewAuthServiceClient(conn)

	return func(c *gin.Context) {
		// 1. Lấy token từ header "Authorization: Bearer <token>".
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			abortUnauthorized(c, "MISSING_TOKEN", "authorization header is required")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortUnauthorized(c, "INVALID_TOKEN_FORMAT", "authorization header must be: Bearer <token>")
			return
		}
		token := parts[1]

		// 2. Gọi auth-service verify, có timeout để không treo request quá lâu.
		ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer cancel()

		resp, err := client.VerifyToken(ctx, &pmv1.VerifyTokenRequest{AccessToken: token})
		if err != nil || resp == nil || !resp.Valid {
			abortUnauthorized(c, "INVALID_TOKEN", "token is invalid or expired")
			return
		}

		// 3. Gắn user info vào context để handler downstream / upstream dùng.
		c.Set("user_id", resp.UserId)
		c.Set("user_email", resp.Email)
		c.Next()
	}
}

// abortUnauthorized dừng request với 401 + body lỗi chuẩn.
func abortUnauthorized(c *gin.Context, code, message string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error": gin.H{"code": code, "message": message},
	})
}

// RequireAuth đọc user info mà JWTAuth đã set vào gin context. Handler nào
// cần biết "ai đang gọi" thì dùng hàm này.
func RequireAuth(c *gin.Context) (userID int64, email string, ok bool) {
	uid, exists := c.Get("user_id")
	if !exists {
		return 0, "", false
	}
	// c.Set("user_id", resp.UserId) lưu int64 (proto UserId là int64) → assert int64.
	userID, ok = uid.(int64)
	if !ok {
		return 0, "", false
	}
	if e, exists := c.Get("user_email"); exists {
		email, _ = e.(string)
	}
	return userID, email, true
}
