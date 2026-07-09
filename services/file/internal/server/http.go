package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/pm-platform/file/internal/config"
	"github.com/pm-platform/file/internal/handler"
	"github.com/pm-platform/file/internal/middleware"
	"github.com/pm-platform/file/internal/observability"
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
	fileHandler *handler.FileHandler,
) *HTTPServer {
	// Production mode tắt debug log, tối ưu performance.
	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Giới hạn RAM đệm khi parse multipart upload (32MB); phần vượt sẽ được ghi
	// ra file tạm thay vì giữ hết trong bộ nhớ → tránh OOM khi upload file lớn.
	r.MaxMultipartMemory = 32 << 20

	// Middleware stack — THỨ TỰ QUAN TRỌNG.
	// RequestID trước để các middleware sau có thể log request_id.
	r.Use(middleware.RequestID())
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

	// API v1 — file routes. Gateway đã verify JWT và inject X-User-ID;
	// RequireUser đọc header đó → set user_id vào context cho toàn bộ group.
	files := r.Group("/api/v1/files")
	files.Use(middleware.RequireUser())
	{
		files.POST("", fileHandler.Upload)              // upload (owner = caller)
		files.GET("", fileHandler.List)                 // list file của caller
		files.GET("/:id", fileHandler.Get)              // metadata
		files.GET("/:id/content", fileHandler.Download) // stream nội dung
		files.DELETE("/:id", fileHandler.Delete)        // xóa (owner only)
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
