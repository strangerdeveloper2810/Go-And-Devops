package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pm-platform/auth/internal/model"
	"github.com/pm-platform/auth/internal/service"
)

type AuthHandler struct {
	svc service.AuthService
}

func NewAuthHandler(svc service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type RegisterRequest struct {
	Email    string `json:"email"    binding:"required,email"` // required + format email
	Password string `json:"password" binding:"required,min=8"` // tối thiểu 8 ký tự
	Name     string `json:"name"     binding:"required"`       // required
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	// ShouldBindJSON: parse JSON → validate binding tags → trả lỗi nếu fail.
	if err := c.ShouldBindJSON(&req); err != nil {
		// 400 Bad Request — client gửi sai format.
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}

	user, err := h.svc.Register(c.Request.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		// 409 Conflict — email đã tồn tại (duplicate).
		c.JSON(http.StatusConflict, errorBody("REGISTER_FAILED", err.Error()))
		return
	}

	// 201 Created — resource mới được tạo.
	c.JSON(http.StatusCreated, gin.H{
		"user": userToJSON(user),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}

	token, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		// 401 Unauthorized — sai email/password hoặc account bị khóa.
		// Không phân biệt lý do cụ thể trong message (security).
		c.JSON(http.StatusUnauthorized, errorBody("LOGIN_FAILED", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  token.AccessToken,
		"refresh_token": token.RefreshToken,
		"expires_in":    token.ExpiresIn,
		"token_type":    "Bearer", // Chuẩn: cho client biết cách gửi token
	})
}

// errorBody tạo response body chuẩn cho lỗi.
func errorBody(code, message string) gin.H {
	return gin.H{"error": gin.H{"code": code, "message": message}}
}

// userToJSON convert model.User → API response.
// Tách khỏi model để model không phụ thuộc vào response format.
func userToJSON(u *model.User) gin.H {
	return gin.H{
		"id":         u.ID,
		"email":      u.Email,
		"name":       u.Name,
		"avatar_url": u.AvatarURL,
		"status":     u.Status,
		"created_at": u.CreatedAt,
	}
}
