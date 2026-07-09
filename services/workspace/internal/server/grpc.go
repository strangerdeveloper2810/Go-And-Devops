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

	pmv1 "github.com/pm-platform/proto-go/pm/v1"
	"github.com/pm-platform/workspace/internal/config"
	"github.com/pm-platform/workspace/internal/model"
	"github.com/pm-platform/workspace/internal/service"
)

// WorkspaceGRPCServer implements the gRPC WorkspaceService generated from proto.
// Embed UnimplementedWorkspaceServiceServer = forward-compatible.
// Khi proto thêm method mới, code cũ không bị break (có default impl).
type WorkspaceGRPCServer struct {
	pmv1.UnimplementedWorkspaceServiceServer
	svc    service.WorkspaceService
	srv    *grpc.Server
	lis    net.Listener
	logger *slog.Logger
	cfg    *config.Config
}

func NewWorkspaceGRPCServer(cfg *config.Config, logger *slog.Logger, svc service.WorkspaceService) (*WorkspaceGRPCServer, error) {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.GRPCPort))
	if err != nil {
		return nil, fmt.Errorf("grpc listen: %w", err)
	}

	s := grpc.NewServer()

	w := &WorkspaceGRPCServer{
		svc:    svc,
		srv:    s,
		lis:    lis,
		logger: logger,
		cfg:    cfg,
	}

	// Đăng ký service implementation vào gRPC server.
	pmv1.RegisterWorkspaceServiceServer(s, w)

	// Standard gRPC health check — Kubernetes/Docker health probe dùng cái này.
	hs := health.NewServer()
	hs.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(s, hs)

	// Reflection = cho phép grpcurl khám phá API (giống Swagger UI cho REST).
	// Chỉ bật non-prod.
	if cfg.Env != "prod" {
		reflection.Register(s)
	}

	return w, nil
}

func (w *WorkspaceGRPCServer) Start() error {
	w.logger.Info("grpc server listening", slog.String("addr", w.lis.Addr().String()))
	if err := w.srv.Serve(w.lis); err != nil {
		return fmt.Errorf("grpc serve: %w", err)
	}
	return nil
}

func (w *WorkspaceGRPCServer) Shutdown(ctx context.Context) error {
	w.logger.Info("grpc server shutting down")
	stopped := make(chan struct{})
	go func() {
		w.srv.GracefulStop() // Không nhận request mới, chờ in-flight xong
		close(stopped)
	}()
	select {
	case <-stopped:
		return nil
	case <-ctx.Done():
		w.srv.Stop() // Force stop nếu quá timeout
		return ctx.Err()
	}
}

// ─── gRPC Handlers ────────────────────────────────────────────

// GetWorkspace: internal — caller là service nội bộ đã tin cậy, không check membership.
func (w *WorkspaceGRPCServer) GetWorkspace(ctx context.Context, req *pmv1.GetWorkspaceRequest) (*pmv1.GetWorkspaceResponse, error) {
	ws, err := w.svc.GetWorkspaceByID(ctx, req.Id)
	if err != nil {
		// codes.NotFound = HTTP 404 trong gRPC.
		return nil, status.Error(codes.NotFound, "workspace not found")
	}
	return &pmv1.GetWorkspaceResponse{Workspace: toProtoWorkspace(ws)}, nil
}

// ListWorkspaces: liệt kê các workspace mà user là thành viên.
func (w *WorkspaceGRPCServer) ListWorkspaces(ctx context.Context, req *pmv1.ListWorkspacesRequest) (*pmv1.ListWorkspacesResponse, error) {
	list, err := w.svc.ListMyWorkspaces(ctx, req.UserId)
	if err != nil {
		return nil, status.Error(codes.Internal, "list workspaces failed")
	}

	pbWorkspaces := make([]*pmv1.Workspace, len(list))
	for i, ws := range list {
		pbWorkspaces[i] = toProtoWorkspace(ws)
	}

	return &pmv1.ListWorkspacesResponse{Workspaces: pbWorkspaces}, nil
}

// CheckMembership: user có thuộc workspace không + role. Không phải member → is_member=false.
func (w *WorkspaceGRPCServer) CheckMembership(ctx context.Context, req *pmv1.CheckMembershipRequest) (*pmv1.CheckMembershipResponse, error) {
	isMember, role, err := w.svc.CheckMembership(ctx, req.WorkspaceId, req.UserId)
	if err != nil {
		return nil, status.Error(codes.Internal, "check membership failed")
	}
	return &pmv1.CheckMembershipResponse{
		IsMember: isMember,
		Role:     role,
	}, nil
}

// toProtoWorkspace maps model.Workspace → proto Workspace.
func toProtoWorkspace(ws *model.Workspace) *pmv1.Workspace {
	return &pmv1.Workspace{
		Id:        ws.ID,
		Slug:      ws.Slug,
		Name:      ws.Name,
		OwnerId:   ws.OwnerID,
		Plan:      ws.Plan,
		CreatedAt: timestamppb.New(ws.CreatedAt), // time.Time → proto Timestamp
	}
}
