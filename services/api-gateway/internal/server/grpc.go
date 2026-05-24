package server

import (
	"context"
	"fmt"
	"log/slog"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/pm-platform/api-gateway/internal/config"
)

// GRPCServer exposes a minimal gRPC server with reflection (for grpcurl)
// and the standard health protocol. api-gateway primarily acts as a
// gRPC *client* to upstream services; this server exists to support
// internal probes and any future gateway-side RPCs (e.g., admin tools).
type GRPCServer struct {
	srv      *grpc.Server
	listener net.Listener
	logger   *slog.Logger
	cfg      *config.Config
}

func NewGRPCServer(cfg *config.Config, logger *slog.Logger) (*GRPCServer, error) {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.GRPCPort))
	if err != nil {
		return nil, fmt.Errorf("grpc listen: %w", err)
	}

	s := grpc.NewServer()

	// Standard gRPC health check (used by Kubernetes, Docker healthcheck).
	hs := health.NewServer()
	hs.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(s, hs)

	// Reflection lets `grpcurl` and similar tools introspect available services.
	if cfg.Env != "prod" {
		reflection.Register(s)
	}

	return &GRPCServer{srv: s, listener: lis, logger: logger, cfg: cfg}, nil
}

func (g *GRPCServer) Start() error {
	g.logger.Info("grpc server listening", slog.String("addr", g.listener.Addr().String()))
	if err := g.srv.Serve(g.listener); err != nil {
		return fmt.Errorf("grpc serve: %w", err)
	}
	return nil
}

// Shutdown drains in-flight RPCs and stops the server. ctx is used for
// the deadline; on expiry we fall back to forceful Stop.
func (g *GRPCServer) Shutdown(ctx context.Context) error {
	g.logger.Info("grpc server shutting down")
	stopped := make(chan struct{})
	go func() {
		g.srv.GracefulStop()
		close(stopped)
	}()
	select {
	case <-stopped:
		return nil
	case <-ctx.Done():
		g.srv.Stop()
		return ctx.Err()
	}
}
