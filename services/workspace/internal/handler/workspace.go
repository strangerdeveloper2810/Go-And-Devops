package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/pm-platform/workspace/internal/middleware"
	"github.com/pm-platform/workspace/internal/service"
)

// WorkspaceHandler map HTTP request → WorkspaceService, rồi map lỗi sentinel của
// service sang HTTP status. Caller (user id) luôn lấy từ middleware.UserID(c) —
// header X-User-ID do gateway inject, KHÔNG lấy từ body (chống giả mạo).
type WorkspaceHandler struct {
	svc service.WorkspaceService
}

func NewWorkspaceHandler(svc service.WorkspaceService) *WorkspaceHandler {
	return &WorkspaceHandler{svc: svc}
}

// ---- Request bodies ----

type createWorkspaceRequest struct {
	Name string `json:"name" binding:"required"`
}

type updateWorkspaceRequest struct {
	// Optional cả hai — rỗng nghĩa là giữ nguyên (service tự bỏ qua field rỗng).
	Name string `json:"name"`
	Plan string `json:"plan"`
}

type addMemberRequest struct {
	UserID int64  `json:"user_id" binding:"required"`
	Role   string `json:"role"    binding:"required"`
}

type createProjectRequest struct {
	Key  string `json:"key"  binding:"required"`
	Name string `json:"name" binding:"required"`
}

// ---- Workspaces ----

func (h *WorkspaceHandler) Create(c *gin.Context) {
	var req createWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	ws, err := h.svc.CreateWorkspace(c.Request.Context(), middleware.UserID(c), req.Name)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"workspace": ws})
}

func (h *WorkspaceHandler) List(c *gin.Context) {
	list, err := h.svc.ListMyWorkspaces(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"workspaces": list})
}

func (h *WorkspaceHandler) Get(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	ws, err := h.svc.GetWorkspace(c.Request.Context(), middleware.UserID(c), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"workspace": ws})
}

func (h *WorkspaceHandler) Update(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req updateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	ws, err := h.svc.UpdateWorkspace(c.Request.Context(), middleware.UserID(c), id, req.Name, req.Plan)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"workspace": ws})
}

func (h *WorkspaceHandler) Delete(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.DeleteWorkspace(c.Request.Context(), middleware.UserID(c), id); err != nil {
		h.respondErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Members ----

func (h *WorkspaceHandler) AddMember(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req addMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	m, err := h.svc.AddMember(c.Request.Context(), middleware.UserID(c), wsID, req.UserID, req.Role)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"member": m})
}

func (h *WorkspaceHandler) ListMembers(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	list, err := h.svc.ListMembers(c.Request.Context(), middleware.UserID(c), wsID)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"members": list})
}

func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	targetID, ok := idParam(c, "uid")
	if !ok {
		return
	}
	if err := h.svc.RemoveMember(c.Request.Context(), middleware.UserID(c), wsID, targetID); err != nil {
		h.respondErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Projects ----

func (h *WorkspaceHandler) CreateProject(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req createProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", err.Error()))
		return
	}
	p, err := h.svc.CreateProject(c.Request.Context(), middleware.UserID(c), wsID, req.Key, req.Name)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"project": p})
}

func (h *WorkspaceHandler) ListProjects(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	list, err := h.svc.ListProjects(c.Request.Context(), middleware.UserID(c), wsID)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"projects": list})
}

// ---- Roles ----

func (h *WorkspaceHandler) ListRoles(c *gin.Context) {
	wsID, ok := idParam(c, "id")
	if !ok {
		return
	}
	list, err := h.svc.ListRoles(c.Request.Context(), middleware.UserID(c), wsID)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"roles": list})
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

// respondErr map sentinel errors của service sang HTTP status tương ứng.
func (h *WorkspaceHandler) respondErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, errorBody("NOT_FOUND", err.Error()))
	case errors.Is(err, service.ErrNotMember):
		c.JSON(http.StatusForbidden, errorBody("NOT_MEMBER", err.Error()))
	case errors.Is(err, service.ErrNotOwner):
		c.JSON(http.StatusForbidden, errorBody("NOT_OWNER", err.Error()))
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
