// Package server wires HTTP and gRPC servers, applying middleware and
// routing. main.go composes the pieces; this package owns the layout.
package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"

	"github.com/pm-platform/api-gateway/internal/config"
	"github.com/pm-platform/api-gateway/internal/handler"
	"github.com/pm-platform/api-gateway/internal/middleware"
	"github.com/pm-platform/api-gateway/internal/observability"
)

// HTTPServer wraps *http.Server with deps it owns, plus a typed shutdown
// path that also flips the readiness flag.
type HTTPServer struct {
	srv    *http.Server
	health *handler.HealthChecker
	logger *slog.Logger
	cfg    *config.Config
}

func NewHTTPServer(
	cfg *config.Config,
	logger *slog.Logger,
	metrics *observability.Metrics,
	health *handler.HealthChecker,
) *HTTPServer {
	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Order matters: RequestID first so subsequent middleware can log it.
	r.Use(middleware.RequestID())
	r.Use(otelgin.Middleware(cfg.OTel.ServiceName))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Metrics(metrics))
	r.Use(middleware.Recovery(logger))

	// Health probes (not /metrics — that's for Prometheus, no auth needed).
	r.GET("/health", health.Live)
	r.GET("/ready", health.Ready)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Auth reverse proxy target (auth-service HTTP). httputil.ReverseProxy =
	// reverse proxy built-in của Go (giống http-proxy-middleware của Express).
	// Nil nếu addr trống/parse lỗi → route auth trả 502 thay vì crash.
	var authProxy *httputil.ReverseProxy
	if addr := cfg.Upstream.AuthHTTPAddr; addr != "" {
		u, err := url.Parse("http://" + addr)
		if err != nil {
			logger.Error("invalid upstream.auth_http_addr", slog.String("addr", addr), slog.Any("err", err))
		} else {
			authProxy = httputil.NewSingleHostReverseProxy(u)
		}
	}

	// Workspace reverse proxy target (workspace-service HTTP). Cùng pattern với
	// authProxy. Nil nếu addr trống/parse lỗi → route trả 502 thay vì crash.
	var workspaceProxy *httputil.ReverseProxy
	if addr := cfg.Upstream.WorkspaceHTTPAddr; addr != "" {
		u, err := url.Parse("http://" + addr)
		if err != nil {
			logger.Error("invalid upstream.workspace_http_addr", slog.String("addr", addr), slog.Any("err", err))
		} else {
			workspaceProxy = httputil.NewSingleHostReverseProxy(u)
		}
	}

	// Issue reverse proxy target (issue-service HTTP). Cùng pattern với workspace.
	// Nil nếu addr trống/parse lỗi → route trả 502 thay vì crash.
	var issueProxy *httputil.ReverseProxy
	if addr := cfg.Upstream.IssueHTTPAddr; addr != "" {
		u, err := url.Parse("http://" + addr)
		if err != nil {
			logger.Error("invalid upstream.issue_http_addr", slog.String("addr", addr), slog.Any("err", err))
		} else {
			issueProxy = httputil.NewSingleHostReverseProxy(u)
		}
	}

	// Page reverse proxy target (page-service HTTP). Cùng pattern với issue.
	// Nil nếu addr trống/parse lỗi → route trả 502 thay vì crash.
	var pageProxy *httputil.ReverseProxy
	if addr := cfg.Upstream.PageHTTPAddr; addr != "" {
		u, err := url.Parse("http://" + addr)
		if err != nil {
			logger.Error("invalid upstream.page_http_addr", slog.String("addr", addr), slog.Any("err", err))
		} else {
			pageProxy = httputil.NewSingleHostReverseProxy(u)
		}
	}

	// File reverse proxy target (file-service HTTP). Cùng pattern với page.
	// Nil nếu addr trống/parse lỗi → route trả 502 thay vì crash.
	var fileProxy *httputil.ReverseProxy
	if addr := cfg.Upstream.FileHTTPAddr; addr != "" {
		u, err := url.Parse("http://" + addr)
		if err != nil {
			logger.Error("invalid upstream.file_http_addr", slog.String("addr", addr), slog.Any("err", err))
		} else {
			fileProxy = httputil.NewSingleHostReverseProxy(u)
		}
	}

	// ─── Public routes — không cần JWT ───────────────────────────
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"pong": true})
		})

		// Auth proxy: forward /api/v1/auth/* → auth-service HTTP.
		// register/login là public (chưa có token) nên nằm ở nhóm public.
		v1.Any("/auth/*proxyPath", func(c *gin.Context) {
			if authProxy == nil {
				c.JSON(http.StatusBadGateway, gin.H{
					"error": gin.H{"code": "AUTH_UNAVAILABLE", "message": "auth service not configured"},
				})
				return
			}
			// gin wildcard *proxyPath đã kèm dấu "/" đầu → TrimPrefix tránh "//".
			// Phòng thủ: nếu proxyPath rỗng thì không thêm "/" đuôi để tránh
			// redirect thừa (cùng lý do với workspace proxy bên dưới).
			sub := strings.TrimPrefix(c.Param("proxyPath"), "/")
			target := "/api/v1/auth"
			if sub != "" {
				target += "/" + sub
			}
			c.Request.URL.Path = target
			authProxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	// ─── Protected routes — cần JWT hợp lệ (verify qua auth gRPC) ─
	protected := r.Group("/api/v1")
	protected.Use(middleware.JWTAuth(cfg.Upstream.AuthAddr))
	{
		protected.GET("/me", func(c *gin.Context) {
			userID, email, _ := middleware.RequireAuth(c)
			c.JSON(http.StatusOK, gin.H{"user_id": userID, "email": email})
		})

		// Workspace proxy: forward /api/v1/workspaces và /api/v1/workspaces/* → workspace HTTP.
		// Nằm trong nhóm protected nên JWTAuth chạy trước, verify token và inject
		// header X-User-ID / X-User-Email → workspace-service tin danh tính này.
		//
		// Đăng ký CẢ path collection trần ("/workspaces") LẪN catch-all
		// ("/workspaces/*proxyPath"): route catch-all của gin KHÔNG match path trần,
		// nên nếu chỉ có nó thì gin RedirectTrailingSlash sẽ 301/307 "/workspaces"
		// → "/workspaces/" TRƯỚC khi JWTAuth chạy — vừa lộ redirect cho client, vừa
		// bỏ qua auth trên path trần. Có route trần → handler chạy trực tiếp, đúng.
		wsProxy := func(c *gin.Context) {
			if workspaceProxy == nil {
				c.JSON(http.StatusBadGateway, gin.H{
					"error": gin.H{"code": "WORKSPACE_UNAVAILABLE", "message": "workspace service not configured"},
				})
				return
			}
			// gin wildcard *proxyPath kèm dấu "/" đầu → TrimPrefix tránh "//".
			// Path trần → Param("proxyPath") rỗng → giữ "/api/v1/workspaces" (không "/"
			// đuôi) khớp route ws.POST("")/ws.GET("") của workspace-service.
			sub := strings.TrimPrefix(c.Param("proxyPath"), "/")
			target := "/api/v1/workspaces"
			if sub != "" {
				target += "/" + sub
			}
			c.Request.URL.Path = target
			workspaceProxy.ServeHTTP(c.Writer, c.Request)
		}
		protected.Any("/workspaces", wsProxy)
		protected.Any("/workspaces/*proxyPath", wsProxy)

		// Issue proxy: forward /api/v1/issues[/*] và /api/v1/projects/* → issue HTTP.
		// issue-service sở hữu CẢ issue-scoped ("/issues/{key}", "/issues/{key}/comments"…)
		// LẪN project-scoped ("/projects/{id}/issues", "/…/sprints", "/…/boards") paths.
		// /projects/* HIỆN CHƯA proxy tới workspace (workspace dùng /workspaces/*), nên
		// định tuyến path project-scoped của issue sang issue-service là an toàn, không đụng.
		//
		// JWTAuth (nhóm protected) đã set X-User-ID / X-User-Email lên c.Request.Header →
		// reverse proxy forward nguyên request nên issue-service nhận danh tính đã verify.
		//
		// Đăng ký CẢ "/issues" trần LẪN catch-all "/issues/*proxyPath" (cùng lý do
		// RedirectTrailingSlash như workspace ở trên: nếu chỉ có catch-all thì gin sẽ
		// 301 "/issues" → "/issues/" trước khi JWTAuth chạy).
		//
		// issueProxyTo dựng lại path đích từ prefix cố định + phần wildcard, giữ nguyên
		// cách nối path (TrimPrefix "/" tránh "//"), tái dùng cho cả hai prefix.
		issueProxyTo := func(prefix string) gin.HandlerFunc {
			return func(c *gin.Context) {
				if issueProxy == nil {
					c.JSON(http.StatusBadGateway, gin.H{
						"error": gin.H{"code": "ISSUE_UNAVAILABLE", "message": "issue service not configured"},
					})
					return
				}
				sub := strings.TrimPrefix(c.Param("proxyPath"), "/")
				target := prefix
				if sub != "" {
					target += "/" + sub
				}
				c.Request.URL.Path = target
				issueProxy.ServeHTTP(c.Writer, c.Request)
			}
		}
		protected.Any("/issues", issueProxyTo("/api/v1/issues"))
		protected.Any("/issues/*proxyPath", issueProxyTo("/api/v1/issues"))
		protected.Any("/projects/*proxyPath", issueProxyTo("/api/v1/projects"))

		// Page proxy: forward /api/v1/spaces[/*] và /api/v1/pages[/*] → page HTTP.
		// page-service (Confluence core) sở hữu CẢ space-scoped ("/spaces/{key}",
		// "/spaces/{key}/pages"…) LẪN page-scoped ("/pages/{id}", "/pages/{id}/children"…)
		// paths. Authz = workspace membership (page-service tự check qua projections).
		//
		// JWTAuth (nhóm protected) đã set X-User-ID / X-User-Email lên c.Request.Header →
		// reverse proxy forward nguyên request nên page-service nhận danh tính đã verify.
		//
		// Đăng ký CẢ path trần LẪN catch-all "*proxyPath" cho mỗi collection (cùng lý do
		// RedirectTrailingSlash như workspace/issue ở trên: nếu chỉ có catch-all thì gin
		// sẽ 301 "/spaces" → "/spaces/" trước khi JWTAuth chạy).
		//
		// pageProxyTo dựng lại path đích từ prefix cố định + phần wildcard, tái dùng cho
		// cả hai prefix (giống issueProxyTo).
		pageProxyTo := func(prefix string) gin.HandlerFunc {
			return func(c *gin.Context) {
				if pageProxy == nil {
					c.JSON(http.StatusBadGateway, gin.H{
						"error": gin.H{"code": "PAGE_UNAVAILABLE", "message": "page service not configured"},
					})
					return
				}
				sub := strings.TrimPrefix(c.Param("proxyPath"), "/")
				target := prefix
				if sub != "" {
					target += "/" + sub
				}
				c.Request.URL.Path = target
				pageProxy.ServeHTTP(c.Writer, c.Request)
			}
		}
		protected.Any("/spaces", pageProxyTo("/api/v1/spaces"))
		protected.Any("/spaces/*proxyPath", pageProxyTo("/api/v1/spaces"))
		protected.Any("/pages", pageProxyTo("/api/v1/pages"))
		protected.Any("/pages/*proxyPath", pageProxyTo("/api/v1/pages"))

		// File proxy: forward /api/v1/files[/*] → file-service HTTP (upload/download/metadata).
		// Đăng ký CẢ path trần LẪN catch-all (cùng lý do RedirectTrailingSlash). X-User-ID
		// đã được JWTAuth set → file-service dùng làm owner. Multipart upload forward nguyên request.
		fileProxyHandler := func(c *gin.Context) {
			if fileProxy == nil {
				c.JSON(http.StatusBadGateway, gin.H{
					"error": gin.H{"code": "FILE_UNAVAILABLE", "message": "file service not configured"},
				})
				return
			}
			// File upload/download stream body 2 chiều qua gateway. ReadTimeout/
			// WriteTimeout 15s của http.Server áp cho TOÀN BỘ request → cắt ngang
			// (truncate) upload multipart lớn lẫn download chậm, dù file-service có
			// nới timeout riêng thì gateway vẫn cắt. Xoá deadline cho RIÊNG request
			// /files bằng ResponseController (giữ nguyên 15s cho các route JSON):
			// SetRead/WriteDeadline với zero-time = bỏ deadline. Best-effort — nếu
			// writer không hỗ trợ (ErrNotSupported) thì log rồi vẫn proxy như cũ.
			rc := http.NewResponseController(c.Writer)
			if err := rc.SetReadDeadline(time.Time{}); err != nil {
				logger.Warn("clear file proxy read deadline", slog.Any("err", err))
			}
			if err := rc.SetWriteDeadline(time.Time{}); err != nil {
				logger.Warn("clear file proxy write deadline", slog.Any("err", err))
			}
			sub := strings.TrimPrefix(c.Param("proxyPath"), "/")
			target := "/api/v1/files"
			if sub != "" {
				target += "/" + sub
			}
			c.Request.URL.Path = target
			fileProxy.ServeHTTP(c.Writer, c.Request)
		}
		protected.Any("/files", fileProxyHandler)
		protected.Any("/files/*proxyPath", fileProxyHandler)
	}

	return &HTTPServer{
		srv: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
			Handler:      r,
			ReadTimeout:  cfg.Server.ReadTimeout,
			WriteTimeout: cfg.Server.WriteTimeout,
			IdleTimeout:  60 * time.Second,
		},
		health: health,
		logger: logger,
		cfg:    cfg,
	}
}

// Start blocks until the server returns. http.ErrServerClosed indicates
// a graceful shutdown and is not propagated as an error.
func (h *HTTPServer) Start() error {
	h.logger.Info("http server listening", slog.String("addr", h.srv.Addr))
	if err := h.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("http listen: %w", err)
	}
	return nil
}

// Shutdown flips readiness false (so LB removes us), then gracefully
// closes connections within the configured timeout.
func (h *HTTPServer) Shutdown(ctx context.Context) error {
	h.health.SetShuttingDown(true)
	h.logger.Info("http server shutting down")
	return h.srv.Shutdown(ctx)
}
