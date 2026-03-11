package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/your-username/devops-for-se/services/api/internal/middleware"
)

// SetupRoutes đăng ký tất cả routes cho API
// (h *ProjectHandler) = receiver → method thuộc về ProjectHandler
// router *gin.Engine = bộ router chính (giống app trong Express: const app = express())
//
// Giống Express:
// app.get('/health', healthCheck)
// app.get('/api/v1/projects', projectHandler.listProjects)
func (h *ProjectHandler) SetupRoutes(router *gin.Engine, jwtSecret string) {
	// Health checks - không cần auth, dùng cho Docker/K8s kiểm tra server còn sống không
	router.GET("/health", HealthCheck)
	router.GET("/ready", ReadinessCheck)

	// Route Group = gom các route có chung prefix
	// v1 = /api/v1, projects = /api/v1/projects
	// Giống Express: const v1 = express.Router(); app.use('/api/v1', v1)
	v1 := router.Group("/api/v1")
	projects := v1.Group("projects")                      // REST convention: dùng số NHIỀU "projects" không phải "project"
	projects.Use(middleware.AuthMiddleware(jwtSecret))     // Bảo vệ tất cả route trong group này bằng auth middleware

	// CRUD routes theo REST convention
	// h.GetProject = truyền METHOD REFERENCE (không có dấu "()")
	// Giống React: onClick={handleClick} chứ không phải onClick={handleClick()}
	// Gin sẽ gọi method này khi có request match route
	projects.GET("/:id", h.GetProject)       // GET /api/v1/projects/123 → Lấy 1 project
	projects.GET("", h.ListProjects)         // GET /api/v1/projects     → Lấy danh sách
	projects.POST("", h.CreateProject)       // POST /api/v1/projects    → Tạo mới
	projects.PUT("/:id", h.UpdateProject)    // PUT /api/v1/projects/123 → Cập nhật
	projects.DELETE("/:id", h.DeleteProject) // DELETE /api/v1/projects/123 → Xóa

}

func (au *AuthHandler) SetupRoutes(router *gin.Engine) {
	v1 := router.Group("/api/v1")
	auth := v1.Group("auth")
	auth.POST("/register", au.Register) // POST /api/v1/auth/register → Đăng ký
	auth.POST("/login", au.Login)       // POST /api/v1/auth/login → Đăng nhập
}
