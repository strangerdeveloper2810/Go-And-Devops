// page-service: quản lý spaces + pages (Confluence core).
//
// Chịu trách nhiệm:
//   - REST: /api/v1/spaces/* + /api/v1/pages/* (cho FE gọi qua gateway, nhận X-User-ID)
//   - Kafka: consume workspace.events (EventEnvelope) → workspaces/members projection
//            + auth.user.events (RAW UserCreatedEvent) → users projection
//   - Expose /health, /ready, /metrics
//
// authz cục bộ dựa trên members_projection dựng từ Kafka (loose coupling — không
// gọi đồng bộ sang workspace-service). gRPC/producer bị hoãn ở MVP.
//
// main.go = "bảng mạch chính": tạo dependencies rồi cắm chúng vào nhau
// (config → db → repo → service → handler → server) và quản lý vòng đời
// (khởi động HTTP server + 2 Kafka consumer, chờ tín hiệu tắt, graceful shutdown).
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

	"github.com/pm-platform/page/internal/config"
	"github.com/pm-platform/page/internal/database"
	"github.com/pm-platform/page/internal/events"
	"github.com/pm-platform/page/internal/handler"
	"github.com/pm-platform/page/internal/observability"
	"github.com/pm-platform/page/internal/repository"
	"github.com/pm-platform/page/internal/server"
	"github.com/pm-platform/page/internal/service"
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
	logger.Info("starting page service",
		slog.String("env", cfg.Env),
		slog.Int("http_port", cfg.Server.HTTPPort),
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
	// "Chuỗi cắm dây" của Clean Architecture: mỗi repo cần db; service gom repo
	// domain (space, page) + memberRepo (authz projection); handler cần service.
	// wsProjRepo + userProjRepo chỉ phục vụ Kafka consumer dựng read-model.
	spaceRepo := repository.NewSpaceRepository(db)
	pageRepo := repository.NewPageRepository(db)
	memberRepo := repository.NewMemberProjectionRepo(db)
	wsProjRepo := repository.NewWorkspaceProjectionRepo(db)
	userProjRepo := repository.NewUserProjectionRepo(db)

	pageSvc := service.NewPageService(spaceRepo, pageRepo, memberRepo)
	pageHandler := handler.NewPageHandler(pageSvc)

	// ─── 7. Server: HTTP (Gin) ───────────────────────────────────
	// gRPC bị hoãn ở MVP → chỉ HTTP phục vụ FE (qua gateway).
	httpSrv := server.NewHTTPServer(cfg, logger, metrics, pageHandler)

	// ─── 8. Chạy HTTP server + 2 Kafka consumer song song ────────
	// errCh gom lỗi fatal từ bất kỳ goroutine nào → main thoát ngay.
	// Buffer 3 (HTTP + 2 consumer) để goroutine không bị block.
	errCh := make(chan error, 3)
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := httpSrv.Start(); err != nil {
			errCh <- fmt.Errorf("http: %w", err)
		}
	}()

	// ─── 8b. Kafka consumer: dựng projection cho authz + user info ──
	// Hai topic → hai goroutine riêng. consumerCtx bị cancel lúc shutdown để
	// vòng lặp FetchMessage thoát và Reader tự đóng.
	consumer := events.NewConsumer(cfg.Kafka, wsProjRepo, memberRepo, userProjRepo, logger)
	consumerCtx, consumerCancel := context.WithCancel(context.Background())
	defer consumerCancel()
	wg.Add(2)
	go func() {
		defer wg.Done()
		if err := consumer.RunWorkspaceEvents(consumerCtx); err != nil {
			errCh <- fmt.Errorf("kafka workspace consumer: %w", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := consumer.RunUserEvents(consumerCtx); err != nil {
			errCh <- fmt.Errorf("kafka user consumer: %w", err)
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

	// Dừng Kafka consumer trước: cancel ctx → FetchMessage thoát → Reader đóng.
	consumerCancel()

	var shutdownErrs []error
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("http shutdown: %w", err))
	}

	wg.Wait() // chờ HTTP + 2 consumer goroutine thật sự dừng

	if len(shutdownErrs) > 0 {
		return errors.Join(shutdownErrs...)
	}
	logger.Info("shutdown complete")
	return nil
}
