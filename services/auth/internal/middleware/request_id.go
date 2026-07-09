// Package middleware bundles HTTP middleware reused across PM Platform
// Go services. Anything that's strictly per-service stays in the service.
package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// HeaderRequestID is the canonical request correlation header.
	HeaderRequestID = "X-Request-ID"
	// CtxKeyRequestID is the gin context key for fetching the request ID.
	CtxKeyRequestID = "request_id"
)

// RequestID ensures every request has an `X-Request-ID` header. Honors
// inbound value if present (from edge / client) so a single ID flows
// end-to-end across services.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader(HeaderRequestID)
		if rid == "" {
			rid = uuid.NewString()
		}
		c.Set(CtxKeyRequestID, rid)
		c.Writer.Header().Set(HeaderRequestID, rid)
		c.Next()
	}
}
