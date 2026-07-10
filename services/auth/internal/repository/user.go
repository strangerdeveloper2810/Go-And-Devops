package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/auth/internal/model"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByID(ctx context.Context, id int64) (*model.User, error)
	ListByIDs(ctx context.Context, ids []int64) ([]*model.User, error)
	// Search: tìm user theo tên/email (ILIKE), giới hạn limit. Cho picker/@mention ở FE.
	Search(ctx context.Context, query string, limit int) ([]*model.User, error)
	UpdateStatus(ctx context.Context, id int64, status string) error
}

type postgreUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &postgreUserRepository{db: db}
}

func (r *postgreUserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
        INSERT INTO auth.users (email, password_hash, name, avatar_url, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at, updated_at`

	// $1, $2, ... = PostgreSQL placeholder. MySQL dùng ?, SQL Server dùng @p1.
	// pgx tự động escape parameters — không lo SQL injection.
	// QueryRowContext: trả về 1 row. Scan để đọc từng cột vào biến Go.
	err := r.db.QueryRowContext(ctx, query,
		user.Email, user.PasswordHash, user.Name, user.AvatarURL, user.Status,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert user: %w", err) // %w = wrap error, giữ lại chain
	}
	return nil
}

func (r *postgreUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
		FROM auth.users WHERE email = $1`
	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.AvatarURL, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		// sql.ErrNoRows = không tìm thấy user. Phân biệt với lỗi thật (DB down).
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return user, nil
}

func (r *postgreUserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	query := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE id = $1`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.AvatarURL, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return user, nil
}

func (r *postgreUserRepository) ListByIDs(ctx context.Context, ids []int64) ([]*model.User, error) {
	if len(ids) == 0 {
		return []*model.User{}, nil // Trả về slice rỗng, không nil
	}

	query := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE id = ANY($1)    -- ANY = WHERE id IN (...), nhưng dùng array param
        ORDER BY id`

	// QueryContext trả về nhiều rows. Phải defer rows.Close().
	rows, err := r.db.QueryContext(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("list users by ids: %w", err)
	}
	defer rows.Close() // Đảm bảo rows được đóng dù có lỗi hay không

	var users []*model.User
	for rows.Next() { // rows.Next() = cursor. False khi hết rows.
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.Name,
			&u.AvatarURL, &u.Status, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	// Luôn kiểm tra rows.Err() sau vòng lặp — có thể có lỗi giữa chừng.
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return users, nil
}

// Search: tìm user theo tên hoặc email (ILIKE, không phân biệt hoa thường), ORDER BY name,
// giới hạn limit. Dùng cho FE picker (chọn assignee/member) + gợi ý @mention.
func (r *postgreUserRepository) Search(ctx context.Context, query string, limit int) ([]*model.User, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	pattern := "%" + query + "%"
	sqlq := `
        SELECT id, email, password_hash, name, avatar_url, status, created_at, updated_at
        FROM auth.users
        WHERE name ILIKE $1 OR email ILIKE $1
        ORDER BY name
        LIMIT $2`
	rows, err := r.db.QueryContext(ctx, sqlq, pattern, limit)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	users := []*model.User{}
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.Name,
			&u.AvatarURL, &u.Status, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return users, nil
}

func (r *postgreUserRepository) UpdateStatus(ctx context.Context, id int64, status string) error {
	query := `UPDATE auth.users SET status = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("update user status: %w", err)
	}
	// RowsAffected = số rows bị ảnh hưởng. Nếu = 0, user không tồn tại.
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user %d not found", id)
	}
	return nil
}
