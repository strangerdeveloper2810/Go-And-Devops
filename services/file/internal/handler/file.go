package handler

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/pm-platform/file/internal/middleware"
	"github.com/pm-platform/file/internal/service"
)

// FileHandler map HTTP request → FileService, rồi map lỗi sentinel của service
// sang HTTP status. Caller (owner id) luôn lấy từ middleware.UserID(c) — header
// X-User-ID do gateway inject, KHÔNG lấy từ body (chống giả mạo chủ sở hữu).
type FileHandler struct {
	svc service.FileService
}

func NewFileHandler(svc service.FileService) *FileHandler {
	return &FileHandler{svc: svc}
}

// ---- Files ----

// Upload nhận multipart/form-data: field "file" là nội dung upload, field
// "workspace_id" (tùy chọn) gắn file vào một workspace. owner = caller (X-User-ID).
func (h *FileHandler) Upload(c *gin.Context) {
	// Đọc phần multipart "file": FormFile mở luôn file (multipart.File) kèm header
	// chứa Filename/Size/Content-Type. Thiếu field "file" → 400.
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", "missing form field \"file\""))
		return
	}
	defer file.Close()

	// workspace_id là optional: rỗng → file cá nhân (workspaceID nil). Sai định dạng → 400.
	var workspaceID *int64
	if raw := c.Request.FormValue("workspace_id"); raw != "" {
		wsID, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, errorBody("VALIDATION_ERROR", "invalid workspace_id"))
			return
		}
		workspaceID = &wsID
	}

	// Content-Type lấy từ header của phần multipart; browser thường tự set đúng.
	contentType := header.Header.Get("Content-Type")

	f, err := h.svc.Upload(
		c.Request.Context(),
		middleware.UserID(c),
		workspaceID,
		header.Filename,
		contentType,
		file,
		header.Size,
	)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"file": f})
}

// List liệt kê file của caller (authz owner-based: chỉ thấy file mình sở hữu).
func (h *FileHandler) List(c *gin.Context) {
	list, err := h.svc.ListByOwner(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": list})
}

// Get trả metadata của 1 file (bất kỳ caller đã xác thực nào cũng đọc được).
func (h *FileHandler) Get(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	f, err := h.svc.GetMetadata(c.Request.Context(), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"file": f})
}

// Download stream nội dung file từ object storage thẳng ra client. Set
// Content-Type + Content-Disposition rồi io.Copy body; PHẢI Close ReadCloser.
func (h *FileHandler) Download(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	rc, f, err := h.svc.Download(c.Request.Context(), id)
	if err != nil {
		h.respondErr(c, err)
		return
	}
	defer rc.Close()

	// Mime rỗng → fallback octet-stream để browser không đoán sai kiểu.
	mime := f.Mime
	if mime == "" {
		mime = "application/octet-stream"
	}
	// Header phải set TRƯỚC khi ghi byte đầu tiên. attachment + filename để tải xuống
	// với tên gốc; %q bọc filename trong dấu nháy (an toàn với khoảng trắng).
	c.Header("Content-Type", mime)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", f.Name))
	c.Header("Content-Length", strconv.FormatInt(f.Size, 10))
	c.Status(http.StatusOK)

	// Stream nội dung. Nếu client ngắt giữa chừng, io.Copy trả lỗi nhưng header đã gửi
	// nên không đổi được status — chỉ bỏ qua (request coi như hủy).
	_, _ = io.Copy(c.Writer, rc)
}

// Delete xóa file — chỉ owner mới được xóa (service trả ErrForbidden nếu không phải).
func (h *FileHandler) Delete(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), middleware.UserID(c), id); err != nil {
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

// respondErr map sentinel errors của service sang HTTP status tương ứng.
func (h *FileHandler) respondErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, errorBody("NOT_FOUND", err.Error()))
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, errorBody("FORBIDDEN", err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, errorBody("INTERNAL", err.Error()))
	}
}

// errorBody tạo response body chuẩn cho lỗi (giống auth/workspace-service).
func errorBody(code, message string) gin.H {
	return gin.H{"error": gin.H{"code": code, "message": message}}
}
