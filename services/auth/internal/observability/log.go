// Package observability wires slog (structured logging), OpenTelemetry
// trace, and Prometheus-style metrics. Other services follow the same
// shape so behavior is uniform across PM Platform.
package observability

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"go.opentelemetry.io/otel/trace"
)

// NewLogger returns a JSON slog logger filtered by level (`debug`,
// `info`, `warn`, `error`). The logger is set as slog default so
// `slog.Info(...)` from anywhere uses it.
func NewLogger(level, serviceName string) *slog.Logger {
	opts := &slog.HandlerOptions{
		Level:     parseLevel(level),
		AddSource: false,
	}
	handler := slog.NewJSONHandler(os.Stdout, opts)
	logger := slog.New(handler).With(
		slog.String("service", serviceName),
	)
	slog.SetDefault(logger)
	return logger
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// LogWithTrace attaches the active span's trace_id and span_id to log
// records when present. Call this on the logger returned by NewLogger
// for any code path inside a request context.
func LogWithTrace(ctx context.Context, logger *slog.Logger) *slog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return logger
	}
	return logger.With(
		slog.String("trace_id", span.SpanContext().TraceID().String()),
		slog.String("span_id", span.SpanContext().SpanID().String()),
	)
}
