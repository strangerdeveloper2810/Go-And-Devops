package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/workspace/internal/model"
)

// UserRepository: bảng projection workspace.users, đồng bộ từ Kafka auth.user.events.
// Không tự sinh id — id chính là auth user id. Ghi bằng Upsert để idempotent.
type UserRepository interface {
	Upsert(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id int64) (*model.User, error)
}

type postgreUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &postgreUserRepository{db: db}
}

func (r *postgreUserRepository) Upsert(ctx context.Context, user *model.User) error {
	// ON CONFLICT(id) DO UPDATE: nếu user đã tồn tại thì cập nhật, chưa thì insert.
	// Idempotent — consumer Kafka có thể nhận trùng event mà không lỗi.
	query := `
        INSERT INTO workspace.users (id, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url
        RETURNING created_at`

	err := r.db.QueryRowContext(ctx, query,
		user.ID, user.Email, user.Name, user.AvatarURL,
	).Scan(&user.CreatedAt)
	if err != nil {
		return fmt.Errorf("upsert user: %w", err)
	}
	return nil
}

func (r *postgreUserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	query := `
        SELECT id, email, name, avatar_url, created_at
        FROM workspace.users
        WHERE id = $1`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return user, nil
}
