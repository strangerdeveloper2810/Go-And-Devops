// workspace-service: quản lý workspace (tenant), thành viên, project, role.
//
// Chịu trách nhiệm:
//   - REST: /api/v1/workspaces/* (cho FE gọi qua gateway, nhận X-User-ID)
//   - gRPC: GetWorkspace, ListWorkspaces, CheckMembership (cho service nội bộ)
//   - Kafka: consume auth.user.events → tạo user projection + default workspace
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

	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/database"
	"github.com/pm-platform/workspace/internal/events"
	"github.com/pm-platform/workspace/internal/handler"
	"github.com/pm-platform/workspace/internal/observability"
	"github.com/pm-platform/workspace/internal/repository"
	"github.com/pm-platform/workspace/internal/server"
	"github.com/pm-platform/workspace/internal/service"
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
	logger.Info("starting workspace service",
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
	// "Chuỗi cắm dây" của Clean Architecture:
	//   mỗi repo cần db; service gom tất cả repo + db (để chạy transaction);
	//   handler cần service. Mỗi lớp chỉ biết lớp ngay dưới qua interface.
	wsRepo := repository.NewWorkspaceRepository(db)
	memberRepo := repository.NewMemberRepository(db)
	projectRepo := repository.NewProjectRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	userRepo := repository.NewUserRepository(db)

	wsSvc := service.NewWorkspaceService(db, wsRepo, memberRepo, projectRepo, roleRepo, userRepo)
	wsHandler := handler.NewWorkspaceHandler(wsSvc)

	// ─── 7. Servers: HTTP (Gin) + gRPC ───────────────────────────
	// HTTP phục vụ FE (qua gateway); gRPC phục vụ service nội bộ. Cùng 1 wsSvc.
	httpSrv := server.NewHTTPServer(cfg, logger, metrics, wsHandler)
	grpcSrv, err := server.NewWorkspaceGRPCServer(cfg, logger, wsSvc)
	if err != nil {
		return fmt.Errorf("init grpc server: %w", err)
	}

	// ─── 8. Chạy 2 server song song trên 2 goroutine ─────────────
	// errCh gom lỗi fatal từ bất kỳ server nào → main thoát ngay.
	// Buffer 3 (2 server + Kafka consumer) để goroutine không bị block.
	errCh := make(chan error, 3)
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

	// ─── 8b. Kafka consumer: auth.user.events → tạo default workspace ──
	// Chạy trên goroutine riêng. consumerCtx bị cancel lúc shutdown để
	// vòng lặp ReadMessage thoát và Reader tự đóng.
	consumer := events.NewConsumer(cfg.Kafka, wsSvc, logger)
	consumerCtx, consumerCancel := context.WithCancel(context.Background())
	defer consumerCancel()
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := consumer.Run(consumerCtx); err != nil {
			errCh <- fmt.Errorf("kafka consumer: %w", err)
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

	// Dừng Kafka consumer trước: cancel ctx → ReadMessage thoát → Reader đóng.
	consumerCancel()

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
