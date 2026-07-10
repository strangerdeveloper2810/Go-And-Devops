# CLAUDE.md — Frontend (web/)

Convention cho FE của PM Platform. **FE chưa được khởi tạo** — file này là kim chỉ nam khi bắt đầu
(agent + người cùng theo). Xem `../CLAUDE.md` cho kiến trúc backend + API.

## Stack (khuyến nghị 2026 — chốt lại khi init)
- **React 19 + TypeScript**, build **Vite** (SPA dashboard) — hoặc **Next.js 15** nếu cần SSR/SEO.
- Data fetching + cache: **TanStack Query** (server state). Client state nhẹ: Zustand/Context.
- Form: React Hook Form + Zod. Routing: React Router (Vite) hoặc App Router (Next).
- UI: Tailwind + 1 headless lib (Radix / shadcn-ui). Test: Vitest + Testing Library.

## Quy ước code
- **Arrow function làm mặc định**; chỉ dùng `function` thường khi cần `this` binding.
- TypeScript strict; type mọi API response (khớp shape backend). Không `any` trừ khi bất khả kháng.
- Component: 1 file 1 component, colocate hook/type/test. Ưu tiên server-state qua TanStack Query
  thay vì `useEffect` fetch thủ công (xem skill `vercel-react-best-practices`).
- Comment: tiếng Việt cho business logic, Anh cho boilerplate (đồng bộ backend).

## Kết nối backend (qua api-gateway)
- Base URL: `${VITE_API_BASE_URL}` (dev = `http://localhost:8000/api/v1`). Gateway proxy hết.
- **Auth**: `POST /auth/register {email,password,name}` → 201; `POST /auth/login {email,password}` →
  `{access_token, refresh_token, expires_in, token_type}`. Lưu `access_token`, gắn header
  `Authorization: Bearer <token>` cho MỌI request khác (trừ register/login). `GET /me` → user hiện tại.
- **Lỗi**: mọi lỗi trả `{"error": {"code": "...", "message": "..."}}` + HTTP status chuẩn
  (400 validation, 401 chưa auth, 403 không quyền, 404, 409 conflict). Map `code` → UX.

### API surface đang có (đủ để dựng luồng chính)
| Nhóm | Endpoint (dưới `/api/v1`) |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /me` |
| **Users (directory)** | `GET /users?ids=1,2,3` (resolve tên/avatar), `GET /users?search=foo` (picker/@mention), `GET /users/:id` |
| Workspace | `POST /workspaces`, `GET /workspaces`, `GET /workspaces/:id`, members: `POST/GET /workspaces/:id/members`, projects: `POST/GET /workspaces/:id/projects` |
| Issue | `POST /projects/:pid/issues`, `GET /projects/:pid/issues`, `GET /issues/:key`, `PATCH /issues/:key`, `POST /issues/:key/transitions` |
| Page | `POST /spaces {workspaceId,key,name}`, `GET /spaces?workspaceId=`, `POST /spaces/:id/pages`, `GET /pages/:id`, `GET /pages/:id/children` |
| File | `POST /files` (multipart, field `file`), `GET /files/:id`, `GET /files/:id/content`, `DELETE /files/:id` |

**Lưu ý dựng UI:**
- Issue trả `assigneeId`/`reporterId` là số → dùng `GET /users?ids=` để hiển thị tên/avatar; picker
  chọn người dùng `GET /users?search=`.
- Issue key toàn cục (`PROJ-1`); workspace/project/space key global-unique.
- File: upload multipart trả metadata; xem/tải qua `/files/:id/content` (chỉ owner — 403 nếu không).
- **Chưa có** (defer): comments issue, board/sprint UI-ready, search, notification, realtime.

## Khi khởi tạo FE
1. `web/` là root FE (monorepo cùng backend). Thêm `web/package.json`, cấu hình Vite/Next.
2. Cập nhật `.github/workflows/` thêm job FE (lint eslint + typecheck + test + build) — mirror phong
   cách backend-ci (matrix nếu nhiều app).
3. Cập nhật file này với stack đã chốt + cấu trúc thư mục thật.
