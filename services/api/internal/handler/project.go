package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/your-username/devops-for-se/services/api/internal/model"
	"github.com/your-username/devops-for-se/services/api/internal/service"
)

// ProjectHandler chứa các method xử lý HTTP request cho Project
// Giống class ProjectController trong NestJS/Express
// service field = dependency được inject vào từ bên ngoài (DI pattern)
type ProjectHandler struct {
	service service.ProjectService // Interface, không phải struct cụ thể → dễ test, dễ thay đổi
}

// (h *ProjectHandler) = receiver, giống "this" trong JS class
// h.service.List() = gọi method của service (business logic layer)
// Pattern: Handler nhận request → gọi Service → trả response
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	projects, err := h.service.List()
	if err != nil {
		// Lỗi server → 500 Internal Server Error
		ErrorResponse(c, http.StatusInternalServerError, "Not found project list!")
		return // QUAN TRỌNG: phải return sau error, không thì code tiếp tục chạy xuống dưới
	}
	SuccessResponse(c, http.StatusOK, projects) // 200 OK
}

func (h *ProjectHandler) GetProject(c *gin.Context) {
	// c.Param("id") = lấy URL param, giống req.params.id trong Express
	// Route: GET /api/v1/projects/:id → c.Param("id") = giá trị của :id
	id := c.Param("id")
	project, err := h.service.GetByID(id)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, "Not found project")
		return
	}
	SuccessResponse(c, http.StatusOK, project)
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	// var project model.Project = khai báo biến rỗng kiểu Project
	var project model.Project

	// c.ShouldBindJSON(&project) = parse JSON body vào struct project
	// Giống: const project = req.body trong Express
	// &project = truyền pointer (địa chỉ) → ShouldBindJSON sẽ THAY ĐỔI TRỰC TIẾP biến project
	// Nếu không dùng &, ShouldBindJSON nhận bản copy → thay đổi không ảnh hưởng biến gốc
	if err := c.ShouldBindJSON(&project); err != nil {
		// JSON không hợp lệ → 400 Bad Request
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	project, err := h.service.Create(project)

	if err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// 201 Created = tạo thành công (không dùng 200 cho create)
	SuccessResponse(c, http.StatusCreated, project)
}

func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")

	var project model.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	project, err := h.service.Update(id, project)

	if err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// 200 OK cho update (không dùng 201, vì không tạo mới)
	SuccessResponse(c, http.StatusOK, project)
}

func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")

	err := h.service.Delete(id)

	if err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// 204 No Content = xóa thành công, không trả data
	SuccessResponse(c, http.StatusNoContent, "Delete Successfully!")

}

// NewProjectHandler = Factory function (Constructor trong JS)
// Nhận service interface làm tham số → inject dependency từ bên ngoài
// Trả về *ProjectHandler = pointer tới struct mới tạo
// &ProjectHandler{...} = tạo struct + lấy địa chỉ (pointer) của nó
//
// Tương đương JS:
// class ProjectHandler {
//   constructor(service) { this.service = service; }
// }
func NewProjectHandler(service service.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: service}
}
