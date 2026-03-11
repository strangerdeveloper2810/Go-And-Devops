package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ==================== JWT AUTH MIDDLEWARE ====================
// Middleware = function chạy TRƯỚC handler
// Kiểm tra token trong header → hợp lệ thì cho đi tiếp, không thì trả 401
//
// So sánh Express:
//   const authMiddleware = (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1]
//     if (!token) return res.status(401).json({ error: 'no token' })
//     const decoded = jwt.verify(token, SECRET)
//     req.userId = decoded.user_id
//     next()  // cho đi tiếp
//   }
//
// Gin middleware return gin.HandlerFunc (= function nhận *gin.Context)
// jwtSecret truyền vào qua closure (giống currying trong JS)
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Lấy token từ header Authorization
		// Format: "Bearer eyJhbGci..."
		// FE gửi: headers: { Authorization: `Bearer ${token}` }
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Authorization header required"})
			c.Abort() // DỪNG, không chạy handler phía sau
			return
		}

		// 2. Tách "Bearer " ra, lấy token phần sau
		// strings.Split("Bearer eyJhb...", " ") → ["Bearer", "eyJhb..."]
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid authorization format. Use: Bearer <token>"})
			c.Abort()
			return
		}
		tokenString := parts[1]

		// 3. Parse + verify token
		// jwt.Parse sẽ:
		//   - Decode base64 → lấy header + payload
		//   - Verify signature bằng secret key
		//   - Check expiration (exp)
		// Nếu token hết hạn hoặc signature sai → err != nil
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Callback này kiểm tra thuật toán signing
			// Đảm bảo token dùng HMAC (HS256), không phải thuật toán khác
			// Phòng trường hợp hacker đổi algorithm trong header (algorithm confusion attack)
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// 4. Lấy claims (data bên trong token)
		// claims["user_id"] = user ID đã đặt vào lúc generateToken
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid token claims"})
			c.Abort()
			return
		}

		// 5. Lưu user info vào context
		// c.Set() = gắn data vào request context
		// Handler phía sau dùng c.Get("user_id") để lấy
		// Giống Express: req.userId = decoded.user_id
		c.Set("user_id", claims["user_id"])
		c.Set("email", claims["email"])

		// 6. Cho đi tiếp → handler sẽ chạy
		// Giống next() trong Express middleware
		c.Next()
	}
}
