package repository

import (
	"github.com/your-username/devops-for-se/services/api/internal/model"

	"database/sql"
)

type UserRepository interface {
	GetByEmail(email string) (model.User, error)
	Create(user model.User) (model.User, error)
}

type userRepository struct {
	db *sql.DB
}

func (u *userRepository) GetByEmail(email string) (model.User, error) {
	var us model.User
	err := u.db.QueryRow(
		"SELECT id, email, password_hash, name, created_at, updated_at, deleted_at FROM users WHERE email = $1 and deleted_at is NULL",
		email).Scan(&us.ID, &us.Email, &us.PasswordHash, &us.Name, &us.CreatedAt, &us.UpdatedAt, &us.DeletedAt)

	if err != nil {
		return model.User{}, err
	}
	return us, nil
}

func (u *userRepository) Create(user model.User) (model.User, error) {
	var us model.User
	err := u.db.QueryRow(`
	INSERT INTO users(email, password_hash, name)
	VALUES ($1, $2, $3)
	RETURNING id, email, password_hash, name, created_at, updated_at, deleted_at
	`, user.Email, user.PasswordHash, user.Name).Scan(&us.ID, &us.Email, &us.PasswordHash, &us.Name, &us.CreatedAt, &us.UpdatedAt, &us.DeletedAt)
	if err != nil {
		return model.User{}, err
	}
	return us, nil
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}
