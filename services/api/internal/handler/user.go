package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/your-username/devops-for-se/services/api/internal/service"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthHandler struct {
	service service.AuthService
}

// POST /api/v1/auth/register
func (au *AuthHandler) Register(c *gin.Context) {
	var userRequest RegisterRequest
	if err := c.ShouldBindJSON(&userRequest); err != nil {
		ErrorResponse(c, 400, err.Error())
		return
	}

	user, err := au.service.Register(userRequest.Email, userRequest.Password, userRequest.Name)
	if err != nil {
		ErrorResponse(c, 500, "Failed to register user")
		return
	}

	SuccessResponse(c, 201, gin.H{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
	})
}

// POST /api/v1/auth/login
func (au *AuthHandler) Login(c *gin.Context) {
	var loginRequest LoginRequest

	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		ErrorResponse(c, 400, err.Error())
		return
	}

	token, err := au.service.Login(loginRequest.Email, loginRequest.Password)
	if err != nil {
		ErrorResponse(c, 401, "Invalid email or password")
		return
	}

	SuccessResponse(c, 200, gin.H{"token": token})
}

func NewAuthHandler(service service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}
