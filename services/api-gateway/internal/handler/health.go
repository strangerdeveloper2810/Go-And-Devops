// Package handler bundles HTTP request handlers for api-gateway.
package handler

import (
	"context"
	"net/http"
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

// HealthChecker reports whether the service is ready to serve traffic.
// Liveness is "process is running" (this handler returns 200 unless the
// service is shutting down). Readiness adds dependency checks (DB, gRPC
// upstreams) that must be healthy before LB / k8s routes traffic.
type HealthChecker struct {
	shuttingDown atomic.Bool
	deps         []DepCheck
}

// DepCheck pings a single dependency. Return nil on healthy, error on
// degraded. Implementations should respect ctx deadlines.
type DepCheck struct {
	Name string
	Ping func(ctx context.Context) error
}

func NewHealthChecker(deps ...DepCheck) *HealthChecker {
	return &HealthChecker{deps: deps}
}

// SetShuttingDown flips the readiness flag so /ready returns 503 while
// the service drains connections.
func (h *HealthChecker) SetShuttingDown(v bool) { h.shuttingDown.Store(v) }

// Live is the liveness probe (k8s/LB restart trigger). Always 200 when
// the process is up; returns 503 only when graceful shutdown started.
func (h *HealthChecker) Live(c *gin.Context) {
	if h.shuttingDown.Load() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "shutting_down"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// Ready is the readiness probe (k8s/LB add-to-pool gate). Verifies all
// declared dependencies are healthy.
func (h *HealthChecker) Ready(c *gin.Context) {
	if h.shuttingDown.Load() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "shutting_down"})
		return
	}

	results := make(map[string]string, len(h.deps))
	allOK := true
	for _, d := range h.deps {
		if err := d.Ping(c.Request.Context()); err != nil {
			allOK = false
			results[d.Name] = "down: " + err.Error()
			continue
		}
		results[d.Name] = "ok"
	}

	status := http.StatusOK
	if !allOK {
		status = http.StatusServiceUnavailable
	}
	c.JSON(status, gin.H{
		"status": ternary(allOK, "ready", "degraded"),
		"deps":   results,
	})
}

func ternary[T any](cond bool, a, b T) T {
	if cond {
		return a
	}
	return b
}
