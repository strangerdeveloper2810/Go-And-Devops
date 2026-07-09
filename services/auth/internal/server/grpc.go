package server

// Package server wires HTTP and gRPC servers.

import (
	"context"
	"fmt"
	"log/slog"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pm-platform/auth/internal/config"
	"github.com/pm-platform/auth/internal/service"
	pmv1 "github.com/pm-platform/proto-go/pm/v1"
)

// AuthGRPCServer implements the gRPC AuthService generated from proto.
// Embed UnimplementedAuthServiceServer = forward-compatible.
// Khi proto thêm method mới, code cũ không bị break (có default impl).
type AuthGRPCServer struct {
	pmv1.UnimplementedAuthServiceServer
	svc    service.AuthService
	srv    *grpc.Server
	lis    net.Listener
	logger *slog.Logger
	cfg    *config.Config
}

func NewAuthGRPCServer(cfg *config.Config, logger *slog.Logger, svc service.AuthService) (*AuthGRPCServer, error) {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.GRPCPort))
	if err != nil {
		return nil, fmt.Errorf("grpc listen: %w", err)
	}

	s := grpc.NewServer()

	a := &AuthGRPCServer{
		svc:    svc,
		srv:    s,
		lis:    lis,
		logger: logger,
		cfg:    cfg,
	}

	// Đăng ký service implementation vào gRPC server.
	pmv1.RegisterAuthServiceServer(s, a)

	// Standard gRPC health check — Kubernetes/Docker health probe dùng cái này.
	hs := health.NewServer()
	hs.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(s, hs)

	// Reflection = cho phép grpcurl khám phá API (giống Swagger UI cho REST).
	// Chỉ bật non-prod.
	if cfg.Env != "prod" {
		reflection.Register(s)
	}

	return a, nil
}

func (a *AuthGRPCServer) Start() error {
	a.logger.Info("grpc server listening", slog.String("addr", a.lis.Addr().String()))
	if err := a.srv.Serve(a.lis); err != nil {
		return fmt.Errorf("grpc serve: %w", err)
	}
	return nil
}

func (a *AuthGRPCServer) Shutdown(ctx context.Context) error {
	a.logger.Info("grpc server shutting down")
	stopped := make(chan struct{})
	go func() {
		a.srv.GracefulStop() // Không nhận request mới, chờ in-flight xong
		close(stopped)
	}()
	select {
	case <-stopped:
		return nil
	case <-ctx.Done():
		a.srv.Stop() // Force stop nếu quá timeout
		return ctx.Err()
	}
}

// ─── gRPC Handlers ────────────────────────────────────────────

func (a *AuthGRPCServer) VerifyToken(ctx context.Context, req *pmv1.VerifyTokenRequest) (*pmv1.VerifyTokenResponse, error) {
	claims, err := a.svc.VerifyToken(ctx, req.AccessToken)
	if err != nil {
		// Token invalid không phải là system error — trả về valid=false.
		// Không return gRPC error vì client cần phân biệt:
		//   - valid=false: token hết hạn/sai → client refresh
		//   - gRPC error: auth service đang lỗi → client retry
		return &pmv1.VerifyTokenResponse{Valid: false}, nil
	}

	return &pmv1.VerifyTokenResponse{
		Valid:  true,
		UserId: claims.UserID,
		Email:  claims.Email,
	}, nil
}

func (a *AuthGRPCServer) GetUser(ctx context.Context, req *pmv1.GetUserRequest) (*pmv1.GetUserResponse, error) {
	user, err := a.svc.GetUser(ctx, req.UserId)
	if err != nil {
		// codes.NotFound = HTTP 404 trong gRPC.
		return nil, status.Error(codes.NotFound, "user not found")
	}

	return &pmv1.GetUserResponse{
		User: &pmv1.User{
			Id:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			AvatarUrl: user.AvatarURL,
			Status:    toProtoStatus(user.Status),
			CreatedAt: timestamppb.New(user.CreatedAt), // time.Time → proto Timestamp
		},
	}, nil
}

func (a *AuthGRPCServer) ListUsers(ctx context.Context, req *pmv1.ListUsersRequest) (*pmv1.ListUsersResponse, error) {
	users, err := a.svc.ListUsers(ctx, req.Ids)
	if err != nil {
		return nil, status.Error(codes.Internal, "list users failed")
	}

	pbUsers := make([]*pmv1.User, len(users))
	for i, u := range users {
		pbUsers[i] = &pmv1.User{
			Id:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			AvatarUrl: u.AvatarURL,
			Status:    toProtoStatus(u.Status),
			CreatedAt: timestamppb.New(u.CreatedAt),
		}
	}

	return &pmv1.ListUsersResponse{
		Users: pbUsers,
		Page: &pmv1.PageResponse{
			TotalCount: int32(len(users)),
		},
	}, nil
}

// toProtoStatus maps model status string → proto enum.
func toProtoStatus(s string) pmv1.UserStatus {
	switch s {
	case "active":
		return pmv1.UserStatus_USER_STATUS_ACTIVE
	case "inactive":
		return pmv1.UserStatus_USER_STATUS_INACTIVE
	case "invited":
		return pmv1.UserStatus_USER_STATUS_INVITED
	case "migrated":
		return pmv1.UserStatus_USER_STATUS_MIGRATED
	default:
		return pmv1.UserStatus_USER_STATUS_UNSPECIFIED
	}
}
