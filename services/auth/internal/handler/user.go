package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/pm-platform/auth/internal/repository"
)

// UserHandler: user-directory REST cho FE — resolve user_id → tên/avatar (hiển thị
// assignee/reporter/member) + tìm user cho picker/@mention. Chỉ đọc; model.User có
// json:"-" trên password_hash nên không bao giờ lộ hash.
type UserHandler struct {
	repo repository.UserRepository
}

func NewUserHandler(repo repository.UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

// List: GET /api/v1/users?ids=1,2,3  (resolve hàng loạt)  HOẶC  ?search=foo  (picker).
func (h *UserHandler) List(c *gin.Context) {
	if raw := c.Query("ids"); raw != "" {
		users, err := h.repo.ListByIDs(c.Request.Context(), parseIDs(raw))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL", "message": "lỗi nội bộ"}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"users": users})
		return
	}
	if q := c.Query("search"); q != "" {
		users, err := h.repo.Search(c.Request.Context(), q, 20)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL", "message": "lỗi nội bộ"}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"users": users})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": "cần query ?ids= hoặc ?search="}})
}

// Get: GET /api/v1/users/:id — 1 user.
func (h *UserHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "VALIDATION_ERROR", "message": "id không hợp lệ"}})
		return
	}
	user, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user không tồn tại"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// parseIDs: "1,2, 3" → []int64{1,2,3}, bỏ phần không parse được.
func parseIDs(raw string) []int64 {
	parts := strings.Split(raw, ",")
	ids := make([]int64, 0, len(parts))
	for _, p := range parts {
		if id, err := strconv.ParseInt(strings.TrimSpace(p), 10, 64); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}
