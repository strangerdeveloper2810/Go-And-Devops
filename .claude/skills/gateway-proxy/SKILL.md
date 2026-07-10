---
name: gateway-proxy
description: Use when exposing a PM Platform service through api-gateway — registers the reverse-proxy routes in services/api-gateway/internal/server/http.go the correct way (BOTH bare route + catch-all, in the protected group) so JWTAuth runs before RedirectTrailingSlash and identity headers X-User-ID/X-User-Email are injected.
argument-hint: "<svc> — <collection path vd /spaces>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Gateway reverse-proxy cho service mới

Expose service qua gateway theo mô tả: **$ARGUMENTS**. Gateway là điểm vào REST DUY NHẤT cho FE:
verify JWT → reverse-proxy tới service HTTP. Đọc `services/api-gateway/internal/server/http.go`
(canonical — copy pattern `workspaceProxy`/`wsProxy`) + mục "Gateway proxy" trong `../CLAUDE.md`.

## Quy tắc BẮT BUỘC
- **Đăng ký CẢ route trần (`/x`) LẪN catch-all (`/x/*proxyPath`)** trong nhóm **`protected`**. Nếu
  CHỈ có catch-all → route đó KHÔNG match path trần, gin `RedirectTrailingSlash` sẽ **301 `/x` →
  `/x/` TRƯỚC khi `JWTAuth` chạy** → vừa lộ redirect cho client, vừa **BỎ QUA auth** trên path
  trần. Có route trần → handler chạy trực tiếp, đúng.
- Handler nằm nhóm `protected` (`protected.Use(middleware.JWTAuth(cfg.Upstream.AuthAddr))`) → gateway
  verify token qua **auth gRPC VerifyToken** rồi set `X-User-ID` (int64) + `X-User-Email` lên
  `c.Request.Header`. Reverse proxy forward nguyên request → service tin 2 header này, **KHÔNG tự
  verify JWT lại**, KHÔNG đọc identity từ body.
- Dựng path đích: `sub := strings.TrimPrefix(c.Param("proxyPath"), "/")` (wildcard gin kèm "/" đầu →
  tránh "//"); path trần → `sub` rỗng → giữ prefix KHÔNG có "/" đuôi (khớp route `.GET("")`/`.POST("")`
  của service). Chỉ nối `"/" + sub` khi `sub != ""`.
- Proxy `nil` (addr trống/parse lỗi) → trả `502` `{code:"<SVC>_UNAVAILABLE"}`, KHÔNG crash.
- Route CRUD/business đi qua REST proxy này; gRPC (xem `[[add-grpc]]`) chỉ cho gọi nội bộ service↔service.

## Các bước
1. **Config**: thêm `<Svc>HTTPAddr string` vào `UpstreamConfig` (`internal/config/config.go`,
   `mapstructure:"<svc>_http_addr"`) nếu chưa có — HTTP addr của service (`<svc>:80xx`).
2. **Tạo proxy target** trong `NewHTTPServer` — mirror `workspaceProxy`:
   ```go
   var <svc>Proxy *httputil.ReverseProxy
   if addr := cfg.Upstream.<Svc>HTTPAddr; addr != "" {
       u, err := url.Parse("http://" + addr)
       if err != nil { logger.Error("invalid upstream.<svc>_http_addr", ...) } else {
           <svc>Proxy = httputil.NewSingleHostReverseProxy(u)
       }
   }
   ```
3. **Đăng ký route** trong block `protected { ... }` — mirror `wsProxy`, định nghĩa handler dựng lại
   `c.Request.URL.Path` từ prefix `/api/v1/<collection>` + `sub`, gọi `<svc>Proxy.ServeHTTP(...)`, rồi:
   ```go
   protected.Any("/<collection>", <svc>Proxy handler)
   protected.Any("/<collection>/*proxyPath", <svc>Proxy handler)
   ```
   Nhiều collection (vd page có `/spaces` + `/pages`) → factory `<svc>ProxyTo(prefix)` trả
   `gin.HandlerFunc`, tái dùng cho từng cặp (xem `issueProxyTo`/`pageProxyTo`).
   > File upload (như `/files`) cần xoá deadline read/write bằng `http.NewResponseController` để
   > không cắt ngang stream lớn — xem `fileProxyHandler`.

## Verify (bắt buộc)
```
gofmt -l services/api-gateway
GOWORK=off go -C services/api-gateway build ./... && GOWORK=off go -C services/api-gateway vet ./...
```
Kiểm nhanh cả 2 route đăng ký (trần + catch-all):
`grep -n 'protected.Any("/<collection>' services/api-gateway/internal/server/http.go` → phải ra 2 dòng.
Xong gợi ý `/review`.
