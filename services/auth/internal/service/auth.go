package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/pm-platform/auth/internal/config"
	"github.com/pm-platform/auth/internal/model"
	"github.com/pm-platform/auth/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(ctx context.Context, email, password, name string) (*model.User, error)
	Login(ctx context.Context, email, password string) (*TokenPair, error)
	VerifyToken(ctx context.Context, accessToken string) (*TokenClaims, error)
	GetUser(ctx context.Context, userID int64) (*model.User, error)
	ListUsers(ctx context.Context, ids []int64) ([]*model.User, error)
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type TokenClaims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
}

const bcryptCost = 12

// UserEventPublisher — cổng phát event user.created (do events.Producer hiện thực).
// Khai báo interface ở đây để service KHÔNG phụ thuộc trực tiếp vào package
// events/Kafka (dễ test + cho phép truyền nil khi không bật Kafka).
type UserEventPublisher interface {
	PublishUserCreated(ctx context.Context, user *model.User)
}

type authService struct {
	repo      repository.UserRepository
	jwtConfig config.JWTConfig
	publisher UserEventPublisher
}

// NewAuthService — publisher có thể là nil (không phát event); Register vẫn chạy
// bình thường vì phát event là BEST-EFFORT.
func NewAuthService(repo repository.UserRepository, jwtConfig config.JWTConfig, publisher UserEventPublisher) AuthService {
	return &authService{repo: repo, jwtConfig: jwtConfig, publisher: publisher}
}

func (s *authService) Register(ctx context.Context, email, password, name string) (*model.User, error) {
	// Kiểm tra email đã tồn tại — tránh duplicate.
	if _, err := s.repo.GetByEmail(ctx, email); err == nil {
		return nil, fmt.Errorf("email already registered")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)

	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{
		Email:        email,
		PasswordHash: string(hashed),
		Name:         name,
		Status:       model.UserStatusActive,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Phát event user.created để workspace-service tạo default workspace.
	// BEST-EFFORT: lỗi Kafka KHÔNG làm hỏng đăng ký (producer tự log).
	// Dùng context.WithoutCancel: DB đã commit xong nên việc phát event KHÔNG
	// được gắn với vòng đời request — nếu client ngắt kết nối, ctx bị hủy sẽ
	// khiến Kafka write fail với context.Canceled và event bị mất im lặng
	// (đây là trigger DUY NHẤT provision user ở workspace-service).
	if s.publisher != nil {
		s.publisher.PublishUserCreated(context.WithoutCancel(ctx), user)
	}

	return user, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		// Message mù: email không tồn tại hay sai password đều trả về Y HỆT nhau
		// → attacker không phân biệt được → chống user enumeration.
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Không cho inactive/invited user login.
	if user.Status != model.UserStatusActive {
		return nil, fmt.Errorf("account is %s", user.Status)
	}

	// Generate JWT pair.
	now := time.Now()
	accessToken, err := s.generateJWT(user, now, s.jwtConfig.AccessSecret, s.jwtConfig.AccessTTL)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}
	refreshToken, err := s.generateJWT(user, now, s.jwtConfig.RefreshSecret, s.jwtConfig.RefreshTTL)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtConfig.AccessTTL.Seconds()),
	}, nil

}

func (s *authService) generateJWT(user *model.User, now time.Time, secret string, ttl time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,             // Custom claim
		"email":   user.Email,          // Custom claim
		"iat":     now.Unix(),          // Issued At — khi nào token được tạo
		"exp":     now.Add(ttl).Unix(), // Expires At — khi nào hết hạn
		"iss":     "pm-platform",       // Issuer — ai phát hành token
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// SignedString ký token với secret. Secret phải là []byte.
	return token.SignedString([]byte(secret))
}

func (s *authService) VerifyToken(ctx context.Context, accessToken string) (*TokenClaims, error) {
	// jwt.Parse với key function: xác nhận signing method + trả về secret.
	token, err := jwt.Parse(accessToken, func(token *jwt.Token) (interface{}, error) {
		// Bảo vệ: chỉ chấp nhận HMAC (HS256). Nếu token nói nó là RS256
		// nhưng mình xác nhận bằng HMAC → algorithm confusion attack.
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtConfig.AccessSecret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	// Extract claims. MapClaims = map[string]interface{}.
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// JSON numbers → Go float64. Phải cast, không dùng trực tiếp.
	userID, ok := claims["user_id"].(float64)
	if !ok {
		return nil, fmt.Errorf("user_id claim missing or invalid")
	}
	email, ok := claims["email"].(string)
	if !ok {
		return nil, fmt.Errorf("email claim missing or invalid")
	}

	return &TokenClaims{
		UserID: int64(userID),
		Email:  email,
	}, nil
}

func (s *authService) GetUser(ctx context.Context, userID int64) (*model.User, error) {
	return s.repo.GetByID(ctx, userID)
}

func (s *authService) ListUsers(ctx context.Context, ids []int64) ([]*model.User, error) {
	return s.repo.ListByIDs(ctx, ids)
}
