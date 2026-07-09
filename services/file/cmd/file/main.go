// file-service: quản lý file/attachment. Metadata (tên, size, owner, mime) nằm ở
// Postgres, còn NỘI DUNG nhị phân lưu trên MinIO/S3.
//
// Chịu trách nhiệm:
//   - REST: /api/v1/files/* (cho FE gọi qua gateway, nhận X-User-ID)
//   - Object storage: upload/download/xóa nội dung file trên MinIO
//   - Expose /health, /ready, /metrics
//
// MVP đơn giản: authz owner-based (owner_id = caller), KHÔNG consume Kafka, KHÔNG
// gRPC (defer). main.go = "bảng mạch chính": tạo dependencies rồi cắm vào nhau
// (config → db → storage → repo → service → handler → server) và quản lý vòng đời
// (khởi động HTTP server, chờ tín hiệu tắt, graceful shutdown).
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

	"github.com/pm-platform/file/internal/config"
	"github.com/pm-platform/file/internal/database"
	"github.com/pm-platform/file/internal/handler"
	"github.com/pm-platform/file/internal/observability"
	"github.com/pm-platform/file/internal/repository"
	"github.com/pm-platform/file/internal/server"
	"github.com/pm-platform/file/internal/service"
	"github.com/pm-platform/file/internal/storage"
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
	logger.Info("starting file service",
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

	// ─── 6. Object storage: kết nối MinIO + đảm bảo bucket (fail fast) ──
	store, err := storage.NewStorage(cfg.MinIO)
	if err != nil {
		return fmt.Errorf("init storage: %w", err)
	}
	logger.Info("object storage connected", slog.String("bucket", store.Bucket()))

	// ─── 7. Dependency Injection: repo → service → handler ───────
	// "Chuỗi cắm dây" của Clean Architecture: repo cần db (metadata);
	// service gom repo + storage (nội dung MinIO); handler cần service.
	fileRepo := repository.NewFileRepository(db)
	fileSvc := service.NewFileService(fileRepo, store)
	fileHandler := handler.NewFileHandler(fileSvc)

	// ─── 8. HTTP server (Gin) ────────────────────────────────────
	// Chỉ có HTTP phục vụ FE qua gateway; gRPC + Kafka defer (chưa cần cho MVP).
	httpSrv := server.NewHTTPServer(cfg, logger, metrics, fileHandler)

	// ─── 9. Chạy HTTP server trên goroutine riêng ────────────────
	// errCh gom lỗi fatal từ server → main thoát ngay.
	errCh := make(chan error, 1)
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := httpSrv.Start(); err != nil {
			errCh <- fmt.Errorf("http: %w", err)
		}
	}()

	// ─── 10. Chờ tín hiệu tắt (Ctrl+C / SIGTERM) hoặc lỗi server ──
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info("signal received, shutting down", slog.String("signal", sig.String()))
	case err := <-errCh:
		logger.Error("server error, shutting down", slog.Any("err", err))
	}

	// ─── 11. Graceful shutdown ───────────────────────────────────
	// Cho server thời gian ShutdownTimeout để xử nốt request đang chạy
	// rồi mới đóng hẳn (không cắt ngang giữa chừng client).
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	var shutdownErrs []error
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		shutdownErrs = append(shutdownErrs, fmt.Errorf("http shutdown: %w", err))
	}

	wg.Wait() // chờ goroutine server thật sự dừng

	if len(shutdownErrs) > 0 {
		return errors.Join(shutdownErrs...)
	}
	logger.Info("shutdown complete")
	return nil
}
