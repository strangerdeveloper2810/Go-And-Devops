// api-gateway: edge entry point for PM Platform.
//
// Responsibilities (phase 0 = skeleton; full duties grow per design):
//   - Terminate REST/JSON from FE behind Traefik
//   - Verify JWT (planned phase 1, after auth-service exists)
//   - Enforce rate limit (planned)
//   - Forward to upstream gRPC services
//   - Expose /health, /ready, /metrics
//   - Run a minimal gRPC server for internal probes + future admin RPCs
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/pm-platform/api-gateway/internal/config"
	"github.com/pm-platform/api-gateway/internal/handler"
	"github.com/pm-platform/api-gateway/internal/observability"
	"github.com/pm-platform/api-gateway/internal/server"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logger := observability.NewLogger(cfg.LogLevel, cfg.OTel.ServiceName)
	logger.Info("starting api-gateway",
		slog.String("env", cfg.Env),
		slog.Int("http_port", cfg.Server.HTTPPort),
		slog.Int("grpc_port", cfg.Server.GRPCPort),
	)

	// ─── OpenTelemetry tracing ────────────────────────────────
	traceShutdown, err := observability.InitTracer(context.Background(), observability.TraceConfig{
		Enabled:      cfg.OTel.Enabled,
		ServiceName:  cfg.OTel.ServiceName,
		OTLPEndpoint: cfg.OTel.OTLPEndpoint,
		SampleRate:   cfg.OTel.TraceSampleRate,
		Env:          cfg.Env,
	})
	if err != nil {
		return fmt.Errorf("init tracer: %w", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = traceShutdown(ctx)
	}()

	// ─── Metrics + health ────────────────────────────────────
	metrics := observability.NewMetrics()
	health := handler.NewHealthChecker(
		// Add DepChecks here as upstream services come online, e.g.:
		// {Name: "auth", Ping: client.PingAuth},
	)

	// ─── Servers ────────────────────────────────────────────
	httpSrv := server.NewHTTPServer(cfg, logger, metrics, health)
	grpcSrv, err := server.NewGRPCServer(cfg, logger)
	if err != nil {
		return fmt.Errorf("init grpc server: %w", err)
	}

	// errCh collects fatal errors from either server so main can exit
	// when any one of them fails.
	errCh := make(chan error, 2)
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		defer wg.Done()
		if err := httpSrv.Start(); err != nil {
			errCh <- fmt.Errorf("http: %w", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := grpcSrv.Start(); err != nil {
			errCh <- fmt.Errorf("grpc: %w", err)
		}
	}()

	// ─── Signal handling ─────────────────────────────────────
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info("signal received, shutting down", slog.String("signal", sig.String()))
	case err := <-errCh:
		logger.Error("server error, shutting down", slog.Any("err", err))
	}

	// ─── Graceful shutdown ───────────────────────────────────
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	var shutdownErrs []error
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("http shutdown: %w", err))
	}
	if err := grpcSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("grpc shutdown: %w", err))
	}

	wg.Wait()

	if len(shutdownErrs) > 0 {
		return errors.Join(shutdownErrs...)
	}
	logger.Info("shutdown complete")
	return nil
}
