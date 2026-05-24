package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"

	"github.com/pm-platform/api-gateway/internal/observability"
)

// Recovery catches panics, logs a structured error with stack, and
// returns a 500 response. Sits before any other handler in the chain.
func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				log := observability.LogWithTrace(c.Request.Context(), logger)
				log.Error("panic recovered",
					slog.String("request_id", c.GetString(CtxKeyRequestID)),
					slog.String("method", c.Request.Method),
					slog.String("path", c.Request.URL.Path),
					slog.Any("panic", rec),
					slog.String("stack", string(debug.Stack())),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": gin.H{
						"code":       "INTERNAL_ERROR",
						"message":    "internal server error",
						"request_id": c.GetString(CtxKeyRequestID),
					},
				})
			}
		}()
		c.Next()
	}
}
