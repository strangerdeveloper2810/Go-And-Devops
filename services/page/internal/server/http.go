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

	"github.com/pm-platform/page/internal/config"
	"github.com/pm-platform/page/internal/handler"
	"github.com/pm-platform/page/internal/middleware"
	"github.com/pm-platform/page/internal/observability"
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
	pageHandler *handler.PageHandler,
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

	// API v1 — spaces routes. Gateway đã verify JWT và inject X-User-ID;
	// RequireUser đọc header đó → set user_id vào context cho toàn bộ group.
	// Pages lồng trong space nằm chung group /spaces (POST/GET /:id/pages).
	spaces := r.Group("/api/v1/spaces")
	spaces.Use(middleware.RequireUser())
	{
		spaces.POST("", pageHandler.CreateSpace)
		spaces.GET("", pageHandler.ListSpaces)
		spaces.GET("/:id", pageHandler.GetSpace)
		spaces.PATCH("/:id", pageHandler.UpdateSpace)
		spaces.DELETE("/:id", pageHandler.DeleteSpace)

		spaces.POST("/:id/pages", pageHandler.CreatePage)
		spaces.GET("/:id/pages", pageHandler.ListPages)
	}

	// API v1 — pages routes (thao tác trực tiếp trên page theo id).
	pages := r.Group("/api/v1/pages")
	pages.Use(middleware.RequireUser())
	{
		pages.GET("/:id", pageHandler.GetPage)
		pages.GET("/:id/children", pageHandler.ListChildren)
		pages.PATCH("/:id", pageHandler.UpdatePage)
		pages.DELETE("/:id", pageHandler.DeletePage)
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
