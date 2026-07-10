package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/pm-platform/page/internal/middleware"
	"github.com/pm-platform/page/internal/service"
)

// PageHandler map HTTP request → PageService, rồi map lỗi sentinel của service
// sang HTTP status. Caller (user id) luôn lấy từ middleware.UserID(c) — header
// X-User-ID do gateway inject, KHÔNG lấy từ body (chống giả mạo).
type PageHandler struct {
	svc service.PageService
}

func NewPageHandler(svc service.PageService) *PageHandler {
	return &PageHandler{svc: svc}
}

// ---- Request bodies ----

// Body dùng camelCase khớp với payload FE gửi qua gateway.
type createSpaceRequest struct {
	WorkspaceID int64  `json:"workspaceId" binding:"required"`
	Key         string `json:"key"         binding:"required"`
	Name        string `json:"name"        binding:"required"`
}

type updateSpaceRequest struct {
	// Optional — rỗng nghĩa là giữ nguyên (service tự bỏ qua field rỗng).
	Name string `json:"name"`
}

type createPageRequest struct {
	Title string `json:"title" binding:"required"`
	// parentId nullable → con trỏ (nil = page gốc, không có cha).
	ParentID    *int64 `json:"parentId"`
	ContentHTML string `json:"contentHtml"`
}

type updatePageRequest struct {
	// Optional cả — rỗng nghĩa là giữ nguyên (service tự bỏ qua field rỗng).
	Title       string `json:"title"`
	ContentHTML string `json:"contentHtml"`
	// parentId != nil → di chuyển page sang cha mới; nil = giữ vị trí hiện tại.
	ParentID *int64 `json:"parentId"`
}

// ---- Spaces ----

func (h *PageHandler) CreateSpace(c *gin.Context) {
	var req createSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	space, err := h.svc.CreateSpace(c.Request.Context(), middleware.UserID(c), req.WorkspaceID, req.Key, req.Name)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"space": space})
}

func (h *PageHandler) ListSpaces(c *gin.Context) {
	// workspaceId là query param bắt buộc (danh sách space luôn scope theo workspace).
	workspaceID, ok := queryInt(c, "workspaceId")
	if !ok {
		return
	}
	list, err := h.svc.ListSpaces(c.Request.Context(), middleware.UserID(c), workspaceID)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"spaces": list})
}

func (h *PageHandler) GetSpace(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	space, err := h.svc.GetSpace(c.Request.Context(), middleware.UserID(c), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"space": space})
}

func (h *PageHandler) UpdateSpace(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req updateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	space, err := h.svc.UpdateSpace(c.Request.Context(), middleware.UserID(c), id, req.Name)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"space": space})
}

func (h *PageHandler) DeleteSpace(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.DeleteSpace(c.Request.Context(), middleware.UserID(c), id); err != nil {
		h.respondErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Pages ----

func (h *PageHandler) CreatePage(c *gin.Context) {
	spaceID, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req createPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	// contentText (full-text search) chưa nhận từ FE ở MVP → truyền rỗng.
	page, err := h.svc.CreatePage(c.Request.Context(), middleware.UserID(c), spaceID, req.Title, req.ParentID, req.ContentHTML, "")
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"page": page})
}

func (h *PageHandler) ListPages(c *gin.Context) {
	spaceID, ok := idParam(c, "id")
	if !ok {
		return
	}
	// ?tree=true → trả về cây (con lồng trong Children); mặc định danh sách phẳng.
	tree := c.Query("tree") == "true"
	list, err := h.svc.ListPages(c.Request.Context(), middleware.UserID(c), spaceID, tree)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"pages": list})
}

func (h *PageHandler) GetPage(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	page, err := h.svc.GetPage(c.Request.Context(), middleware.UserID(c), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page})
}

func (h *PageHandler) ListChildren(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	list, err := h.svc.ListChildren(c.Request.Context(), middleware.UserID(c), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"pages": list})
}

func (h *PageHandler) UpdatePage(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req updatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	// contentText (full-text search) chưa nhận từ FE ở MVP → truyền rỗng (giữ nguyên).
	page, err := h.svc.UpdatePage(c.Request.Context(), middleware.UserID(c), id, req.Title, req.ContentHTML, "", req.ParentID)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page})
}

func (h *PageHandler) DeletePage(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.DeletePage(c.Request.Context(), middleware.UserID(c), id); err != nil {
		h.respondErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- helpers ----

// idParam parse path param dạng int64. Fail → 400 + abort, trả ok=false.
func idParam(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", "invalid "+name))
		return 0, false
	}
	return id, true
}

// queryInt parse query param dạng int64. Thiếu/sai → 400 + abort, trả ok=false.
func queryInt(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Query(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", "invalid "+name))
		return 0, false
	}
	return id, true
}

// respondErr map sentinel errors của service sang HTTP status tương ứng.
func (h *PageHandler) respondErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, errorBody("NOT_FOUND", err.Error()))
	case errors.Is(err, service.ErrNotMember):
		c.JSON(http.StatusForbidden, errorBody("NOT_MEMBER", err.Error()))
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, errorBody("CONFLICT", err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, errorBody("INTERNAL", err.Error()))
	}
}

// errorBody tạo response body chuẩn cho lỗi (giống auth-service).
func errorBody(code, message string) gin.H {
	return gin.H{"error": gin.H{"code": code, "message": message}}
}
