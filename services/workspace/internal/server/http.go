package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"

	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/handler"
	"github.com/pm-platform/workspace/internal/middleware"
	"github.com/pm-platform/workspace/internal/observability"
)

// HTTPServer wraps *http.Server với Gin router + health + metrics.
type HTTPServer struct {
	srv    *http.Server
	logger *slog.Logger
	cfg    *config.Config
}

func NewHTTPServer(
	cfg *config.Config,
	logger *slog.Logger,
	metrics *observability.Metrics,
	wsHandler *handler.WorkspaceHandler,
) *HTTPServer {
	// Production mode tắt debug log, tối ưu performance.
	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Middleware stack — THỨ TỰ QUAN TRỌNG.
	// RequestID trước để các middleware sau có thể log request_id.
	r.Use(middleware.RequestID())
	r.Use(otelgin.Middleware(cfg.OTel.ServiceName)) // OTel tracing
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Metrics(metrics))
	r.Use(middleware.Recovery(logger)) // Phải cuối cùng để bắt panic từ tất cả handler

	// Health probes — không cần auth.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "alive"})
	})
	r.GET("/ready", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})
	// Prometheus metrics endpoint.
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 — workspace routes. Gateway đã verify JWT và inject X-User-ID;
	// RequireUser đọc header đó → set user_id vào context cho toàn bộ group.
	ws := r.Group("/api/v1/workspaces")
	ws.Use(middleware.RequireUser())
	{
		ws.POST("", wsHandler.Create)
		ws.GET("", wsHandler.List)
		ws.GET("/:id", wsHandler.Get)
		ws.PATCH("/:id", wsHandler.Update)
		ws.DELETE("/:id", wsHandler.Delete)

		ws.POST("/:id/members", wsHandler.AddMember)
		ws.GET("/:id/members", wsHandler.ListMembers)
		ws.DELETE("/:id/members/:uid", wsHandler.RemoveMember)

		ws.POST("/:id/projects", wsHandler.CreateProject)
		ws.GET("/:id/projects", wsHandler.ListProjects)

		ws.GET("/:id/roles", wsHandler.ListRoles)
	}

	return &HTTPServer{
		srv: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
			Handler:      r,
			ReadTimeout:  cfg.Server.ReadTimeout, // Chống slow client
			WriteTimeout: cfg.Server.WriteTimeout,
			IdleTimeout:  60 * time.Second, // Keep-alive timeout
		},
		logger: logger,
		cfg:    cfg,
	}
}

func (h *HTTPServer) Start() error {
	h.logger.Info("http server listening", slog.String("addr", h.srv.Addr))
	// ListenAndServe blocks. Trả về ErrServerClosed khi Shutdown() được gọi.
	if err := h.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("http listen: %w", err)
	}
	return nil
}

func (h *HTTPServer) Shutdown(ctx context.Context) error {
	h.logger.Info("http server shutting down")
	return h.srv.Shutdown(ctx)
}
