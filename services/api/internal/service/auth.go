package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/your-username/devops-for-se/services/api/internal/model"
	"github.com/your-username/devops-for-se/services/api/internal/repository"
)

// ==================== INTERFACE ====================
// Register: nhận email + password + name → trả user đã tạo
// Login: nhận email + password → trả JWT token (string)
type AuthService interface {
	Register(email, password, name string) (model.User, error)
	Login(email, password string) (string, error)
}

// ==================== STRUCT ====================
// userRepo: gọi DB (GetByEmail, Create)
// jwtSecret: key bí mật để sign JWT token
//
// So sánh JS:
//   class AuthService {
//     constructor(userRepo, jwtSecret) {
//       this.userRepo = userRepo
//       this.jwtSecret = jwtSecret
//     }
//   }
type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

// ==================== REGISTER ====================
// Flow: hash password → tạo user object → lưu DB
//
// Tại sao hash password?
// - KHÔNG BAO GIỜ lưu password gốc vào DB
// - Nếu DB bị hack, hacker chỉ thấy hash, không thể đảo ngược
// - bcrypt tự thêm "salt" (random bytes) → cùng password ra hash khác nhau
//
// So sánh JS:
//   const hash = await bcrypt.hash(password, 10)  // 10 = cost
//   await userRepo.create({ email, passwordHash: hash, name })
func (s *authService) Register(email, password, name string) (model.User, error) {
	// 1. Hash password
	// bcrypt.DefaultCost = 10 (giống số 10 trong bcrypt.hash(pw, 10) của JS)
	// Cost càng cao → hash càng chậm → brute force càng khó
	// []byte() = convert string → bytes (bcrypt nhận bytes, không nhận string)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, err
	}

	// 2. Tạo user object với password đã hash
	user := model.User{
		Email:        email,
		PasswordHash: string(hashedPassword), // convert bytes → string để lưu DB
		Name:         name,
	}

	// 3. Lưu vào DB (repo.Create sẽ INSERT + RETURNING)
	return s.userRepo.Create(user)
}

// ==================== LOGIN ====================
// Flow: tìm user theo email → verify password → tạo JWT token
//
// So sánh JS:
//   const user = await userRepo.findByEmail(email)
//   const match = await bcrypt.compare(password, user.passwordHash)
//   if (!match) throw new Error('invalid credentials')
//   const token = jwt.sign({ user_id: user.id }, SECRET, { expiresIn: '24h' })
//   return token
func (s *authService) Login(email, password string) (string, error) {
	// 1. Tìm user theo email
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		// Email không tồn tại → trả lỗi chung (không nói rõ "email sai")
		// Lý do: nếu nói "email không tồn tại" → hacker biết email nào có trong hệ thống
		return "", errors.New("invalid email or password")
	}

	// 2. So sánh password
	// CompareHashAndPassword: lấy hash từ DB, so với password user nhập
	// Nếu khớp → err = nil, nếu sai → err != nil
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	// 3. Tạo JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return "", err
	}

	return token, nil
}

// ==================== GENERATE JWT TOKEN ====================
// JWT gồm 3 phần: Header.Payload.Signature
//
// Header: {"alg": "HS256", "typ": "JWT"}
// Payload (Claims): {"user_id": "abc-123", "email": "test@mail.com", "exp": 1234567890}
// Signature: HMAC-SHA256(header + payload, secret)
//
// Token ví dụ: eyJhbGci...eyJ1c2Vy...SflKxwRJ (3 phần ngăn bởi dấu chấm)
//
// Ai có token → server biết user là ai (không cần query DB mỗi request)
// Token hết hạn sau 24h → user phải login lại
func (s *authService) generateToken(user model.User) (string, error) {
	// Claims = data bên trong token
	// jwt.MapClaims giống JSON object trong JS: { user_id: "...", exp: ... }
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(), // hết hạn sau 24h
	}

	// Tạo token với thuật toán HS256 (HMAC-SHA256)
	// jwt.NewWithClaims = tạo token chưa sign
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token bằng secret key
	// Giống jwt.sign(payload, secret) trong JS
	// []byte(s.jwtSecret) = convert secret string → bytes
	return token.SignedString([]byte(s.jwtSecret))
}

// ==================== CONSTRUCTOR ====================
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}
