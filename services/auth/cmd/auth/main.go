// auth-service: xác thực người dùng cho PM Platform.
//
// Chịu trách nhiệm:
//   - REST: /api/v1/auth/register, /login (cho FE gọi trực tiếp qua gateway)
//   - gRPC: VerifyToken, GetUser, ListUsers (cho các service nội bộ gọi)
//   - Expose /health, /ready, /metrics
//
// main.go = "bảng mạch chính": tạo dependencies rồi cắm chúng vào nhau
// (config → db → repo → service → handler → server) và quản lý vòng đời
// (khởi động 2 server, chờ tín hiệu tắt, graceful shutdown).
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

	"github.com/pm-platform/auth/internal/config"
	"github.com/pm-platform/auth/internal/database"
	"github.com/pm-platform/auth/internal/events"
	"github.com/pm-platform/auth/internal/handler"
	"github.com/pm-platform/auth/internal/observability"
	"github.com/pm-platform/auth/internal/repository"
	"github.com/pm-platform/auth/internal/server"
	"github.com/pm-platform/auth/internal/service"
)

// main mỏng: chỉ gọi run(). Tách run() để dùng được `return err`
// (defer chạy đúng thứ tự) thay vì rải os.Exit khắp nơi.
func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// ─── 1. Config: đọc env/file, validate ───────────────────────
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// ─── 2. Logger: slog JSON, set làm default toàn app ──────────
	logger := observability.NewLogger(cfg.LogLevel, cfg.OTel.ServiceName)
	logger.Info("starting auth service",
		slog.String("env", cfg.Env),
		slog.Int("http_port", cfg.Server.HTTPPort),
		slog.Int("grpc_port", cfg.Server.GRPCPort),
	)

	// ─── 3. Tracing (OpenTelemetry) ──────────────────────────────
	// Trả về hàm shutdown để flush spans còn đọng lúc thoát.
	// otel.Enabled=false → no-op, không cần collector khi dev.
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

	// ─── 4. Metrics (Prometheus collectors) ──────────────────────
	metrics := observability.NewMetrics()

	// ─── 5. Database: mở pool + ping (fail fast nếu DB chết) ─────
	db, err := database.Connect(context.Background(), cfg.Database.URL)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer db.Close() // đóng pool khi run() kết thúc
	logger.Info("database connected")

	// ─── 6. Dependency Injection: repo → service → handler ───────
	// Đây là "chuỗi cắm dây" của Clean Architecture:
	//   repo cần db, service cần repo + jwt config, handler cần service.
	// Mỗi lớp chỉ biết lớp ngay dưới nó qua interface → dễ test/thay thế.
	// Kafka producer: phát event user.created lên auth.user.events.
	// BEST-EFFORT — inject vào service; lỗi publish chỉ được log, không fail đăng ký.
	userEventProducer := events.NewProducer(cfg.Kafka, logger)
	defer func() {
		if err := userEventProducer.Close(); err != nil {
			logger.Error("close kafka producer", slog.Any("err", err))
		}
	}()

	userRepo := repository.NewUserRepository(db)
	authSvc := service.NewAuthService(userRepo, cfg.JWT, userEventProducer)
	authHandler := handler.NewAuthHandler(authSvc)
	userHandler := handler.NewUserHandler(userRepo) // user-directory REST cho FE

	// ─── 7. Servers: HTTP (Gin) + gRPC ───────────────────────────
	// HTTP phục vụ FE; gRPC phục vụ service nội bộ. Cùng 1 authSvc.
	httpSrv := server.NewHTTPServer(cfg, logger, metrics, authHandler, userHandler)
	grpcSrv, err := server.NewAuthGRPCServer(cfg, logger, authSvc)
	if err != nil {
		return fmt.Errorf("init grpc server: %w", err)
	}

	// ─── 8. Chạy 2 server song song trên 2 goroutine ─────────────
	// errCh gom lỗi fatal từ bất kỳ server nào → main thoát ngay.
	// Buffer 2 để goroutine không bị block nếu cả 2 cùng lỗi.
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

	// ─── 9. Chờ tín hiệu tắt (Ctrl+C / SIGTERM) hoặc lỗi server ──
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info("signal received, shutting down", slog.String("signal", sig.String()))
	case err := <-errCh:
		logger.Error("server error, shutting down", slog.Any("err", err))
	}

	// ─── 10. Graceful shutdown ───────────────────────────────────
	// Cho server thời gian ShutdownTimeout để xử nốt request đang chạy
	// rồi mới đóng hẳn (không cắt ngang giữa chừng client).
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	var shutdownErrs []error
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("http shutdown: %w", err))
	}
	if err := grpcSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("grpc shutdown: %w", err))
	}

	wg.Wait() // chờ 2 goroutine server thật sự dừng

	if len(shutdownErrs) > 0 {
		return errors.Join(shutdownErrs...)
	}
	logger.Info("shutdown complete")
	return nil
}
