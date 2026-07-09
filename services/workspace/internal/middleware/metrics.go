package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pm-platform/workspace/internal/observability"
)

// Metrics records HTTP request counters and latency histograms into the
// Prometheus collectors registered by observability.NewMetrics.
func Metrics(m *observability.Metrics) gin.HandlerFunc {
	return func(c *gin.Context) {
		m.HTTPRequestsInFlight.Inc()
		defer m.HTTPRequestsInFlight.Dec()

		start := time.Now()
		c.Next()
		elapsed := time.Since(start).Seconds()

		route := c.FullPath()
		if route == "" {
			route = "unknown"
		}

		m.HTTPRequestsTotal.WithLabelValues(
			c.Request.Method,
			route,
			strconv.Itoa(c.Writer.Status()),
		).Inc()
		m.HTTPRequestDuration.WithLabelValues(
			c.Request.Method,
			route,
		).Observe(elapsed)
	}
}
