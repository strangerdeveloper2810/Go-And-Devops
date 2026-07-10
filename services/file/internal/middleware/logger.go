package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pm-platform/file/internal/observability"
)

// Logger emits one structured log entry per request after the handler
// finishes. Includes status, latency, route, method, request ID, and
// — when a trace is active — trace/span IDs (via observability.LogWithTrace).
func Logger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		route := c.FullPath()
		if route == "" {
			route = "unknown" // No route matched, e.g. 404
		}

		log := observability.LogWithTrace(c.Request.Context(), logger).With(
			slog.String("request_id", c.GetString(CtxKeyRequestID)),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.String("route", route),
			slog.Int("status", status),
			slog.Duration("latency", latency),
			slog.String("client_ip", c.ClientIP()),
			slog.String("user_agent", c.Request.UserAgent()),
		)

		switch {
		case status >= 500:
			log.Error("request completed")
		case status >= 400:
			log.Warn("request completed")
		default:
			log.Info("request completed")
		}
	}
}
