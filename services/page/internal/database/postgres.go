package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	// Side-effect import: đăng ký "pgx" driver vào database/sql.
	// Sau import này, sql.Open("pgx", ...) mới hoạt động.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Connect mở connection pool tới PostgreSQL và verify bằng Ping.
// Trả về *sql.DB — pool của các connections, an toàn cho concurrent use.
func Connect(ctx context.Context, databaseURL string) (*sql.DB, error) {
	// sql.Open chưa kết nối thật — chỉ tạo pool object.
	// Giống new Pool() trong node-postgres: tạo pool, chưa connect.
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Pool config — giới hạn connection để không quá tải DB dev local.
	// Production cần tune mấy số này dựa trên workload + DB capacity.
	db.SetMaxOpenConns(25)                 // Tối đa 25 connections mở đồng thời
	db.SetMaxIdleConns(5)                  // Giữ 5 connections idle sẵn sàng
	db.SetConnMaxLifetime(5 * time.Minute) // Đóng connection sau 5 phút
	db.SetConnMaxIdleTime(1 * time.Minute) // Đóng idle connection sau 1 phút

	// PingContext test kết nối thật với timeout.
	// Nếu DB không tới được, fail ở đây — fail fast, không phải lúc xử lý request.
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel() // defer = cleanup khi function return (giống try-finally)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return db, nil
}
