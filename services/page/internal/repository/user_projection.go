package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pm-platform/page/internal/model"
)

// UserProjectionRepo: bảng projection page.users_projection, đồng bộ từ Kafka auth.user.events.
// Không tự sinh id — id chính là auth user id. Ghi bằng Upsert để idempotent.
type UserProjectionRepo interface {
	Upsert(ctx context.Context, user *model.UserProjection) error
	GetByID(ctx context.Context, id int64) (*model.UserProjection, error)
}

type postgreUserProjectionRepo struct {
	db *sql.DB
}

func NewUserProjectionRepo(db *sql.DB) UserProjectionRepo {
	return &postgreUserProjectionRepo{db: db}
}

func (r *postgreUserProjectionRepo) Upsert(ctx context.Context, user *model.UserProjection) error {
	// ON CONFLICT(id) DO UPDATE: nếu user đã tồn tại thì cập nhật, chưa thì insert.
	// Idempotent — consumer Kafka có thể nhận trùng event mà không lỗi.
	query := `
        INSERT INTO page.users_projection (id, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url`

	_, err := r.db.ExecContext(ctx, query,
		user.ID, user.Email, user.Name, user.AvatarURL,
	)
	if err != nil {
		return fmt.Errorf("upsert user projection: %w", err)
	}
	return nil
}

func (r *postgreUserProjectionRepo) GetByID(ctx context.Context, id int64) (*model.UserProjection, error) {
	query := `
        SELECT id, email, name, avatar_url
        FROM page.users_projection
        WHERE id = $1`

	user := &model.UserProjection{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.Name, &user.AvatarURL,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user projection not found: %w", err)
		}
		return nil, fmt.Errorf("get user projection by id: %w", err)
	}
	return user, nil
}
