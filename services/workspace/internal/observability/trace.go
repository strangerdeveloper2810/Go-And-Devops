package observability

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// TraceConfig knobs for InitTracer. Mirrors fields in config.OTelConfig
// without depending on it (so this package stays usable from anywhere).
type TraceConfig struct {
	Enabled      bool
	ServiceName  string
	OTLPEndpoint string
	SampleRate   float64
	Env          string
}

// InitTracer registers the global TracerProvider and propagator. Returns
// a shutdown func to flush spans on exit. When `Enabled` is false, sets
// a no-op tracer and returns a no-op shutdown.
func InitTracer(ctx context.Context, c TraceConfig) (func(context.Context) error, error) {
	if !c.Enabled {
		// Keep the default no-op TracerProvider; nothing to flush.
		return func(context.Context) error { return nil }, nil
	}

	exporter, err := otlptrace.New(ctx, otlptracegrpc.NewClient(
		otlptracegrpc.WithEndpoint(c.OTLPEndpoint),
		otlptracegrpc.WithInsecure(), // dev: collector inside docker network
	))
	if err != nil {
		return nil, fmt.Errorf("init otlp trace exporter: %w", err)
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(c.ServiceName),
			semconv.DeploymentEnvironment(c.Env),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("build otel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(c.SampleRate)),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	// W3C trace context + baggage propagation across HTTP / gRPC calls.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown, nil
}
