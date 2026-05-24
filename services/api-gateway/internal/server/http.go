// Package server wires HTTP and gRPC servers, applying middleware and
// routing. main.go composes the pieces; this package owns the layout.
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

	"github.com/pm-platform/api-gateway/internal/config"
	"github.com/pm-platform/api-gateway/internal/handler"
	"github.com/pm-platform/api-gateway/internal/middleware"
	"github.com/pm-platform/api-gateway/internal/observability"
)

// HTTPServer wraps *http.Server with deps it owns, plus a typed shutdown
// path that also flips the readiness flag.
type HTTPServer struct {
	srv     *http.Server
	health  *handler.HealthChecker
	logger  *slog.Logger
	cfg     *config.Config
}

func NewHTTPServer(
	cfg *config.Config,
	logger *slog.Logger,
	metrics *observability.Metrics,
	health *handler.HealthChecker,
) *HTTPServer {
	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Order matters: RequestID first so subsequent middleware can log it.
	r.Use(middleware.RequestID())
	r.Use(otelgin.Middleware(cfg.OTel.ServiceName))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Metrics(metrics))
	r.Use(middleware.Recovery(logger))

	// Health probes (not /metrics — that's for Prometheus, no auth needed).
	r.GET("/health", health.Live)
	r.GET("/ready", health.Ready)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 (placeholder; real routes added when upstream services come online).
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"pong": true})
		})
	}

	return &HTTPServer{
		srv: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
			Handler:      r,
			ReadTimeout:  cfg.Server.ReadTimeout,
			WriteTimeout: cfg.Server.WriteTimeout,
			IdleTimeout:  60 * time.Second,
		},
		health: health,
		logger: logger,
		cfg:    cfg,
	}
}

// Start blocks until the server returns. http.ErrServerClosed indicates
// a graceful shutdown and is not propagated as an error.
func (h *HTTPServer) Start() error {
	h.logger.Info("http server listening", slog.String("addr", h.srv.Addr))
	if err := h.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("http listen: %w", err)
	}
	return nil
}

// Shutdown flips readiness false (so LB removes us), then gracefully
// closes connections within the configured timeout.
func (h *HTTPServer) Shutdown(ctx context.Context) error {
	h.health.SetShuttingDown(true)
	h.logger.Info("http server shutting down")
	return h.srv.Shutdown(ctx)
}
