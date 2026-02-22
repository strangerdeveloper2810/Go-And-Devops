package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/your-username/devops-for-se/services/api/internal/config"
	"github.com/your-username/devops-for-se/services/api/internal/database"
	"github.com/your-username/devops-for-se/services/api/internal/handler"
	"github.com/your-username/devops-for-se/services/api/internal/repository"
	"github.com/your-username/devops-for-se/services/api/internal/service"
)

func main() {
	// 1. Load config từ .env (PORT, DATABASE_URL, ...)
	cfg := config.Load()

	// 2. Production thì tắt debug log của Gin
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Cannot connect to database: %v", err)
	}

	defer db.Close()

	// 3. Tạo router + middleware
	// gin.New() = router trống
	// Logger() = log mỗi request (giống morgan trong Express)
	// Recovery() = nếu code panic thì recover, không crash server
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// 4. Đăng ký routes (tách ra file riêng cho clean)
	repo := repository.NewProjectRepository(db)
	svc := service.NewProjectService(repo)
	projectHandler := handler.NewProjectHandler(svc)
	projectHandler.SetupRoutes(router)

	// 5. Tạo HTTP server với timeout
	// Không dùng router.Run() vì cần custom timeout + graceful shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 6. Start server trong goroutine (vì ListenAndServe blocking)
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// 7. Đợi Ctrl+C hoặc kill signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit // block ở đây cho đến khi nhận signal

	log.Println("Shutting down server...")

	// 8. Cho server 30s để xử lý nốt requests đang chạy
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
