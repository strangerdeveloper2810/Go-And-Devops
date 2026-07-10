---
name: react-data-fetching
description: Use when gọi REST api-gateway từ React — dựng data layer bằng TanStack Query v5 (JWT Bearer từ Zustand, 401 → logout/refresh, khớp bảng API contract, useQuery đọc / useMutation + invalidateQueries ghi, type TS strict).
argument-hint: "<nhóm resource> — <đọc|ghi> <endpoint>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# React data fetching (TanStack Query v5)

Dựng phần gọi API cho FE theo mô tả: **$ARGUMENTS**. Đọc `web/CLAUDE.md` (**Kết nối backend** +
**API surface đang có**) + `../CLAUDE.md` (gateway REST cổng 8000 là điểm vào, verify JWT + inject
`X-User-ID`) TRƯỚC. Lưu ý: code `web/` chưa init — nếu chưa có `apiClient`/`queryClient` thì tạo mới
theo quy tắc dưới, rồi bám vào.

## Quy tắc BẮT BUỘC
- **Base URL DUY NHẤT = gateway cổng 8000**: `import.meta.env.VITE_API_BASE_URL`
  (dev = `http://localhost:8000/api/v1`). KHÔNG gọi thẳng service (8001..8005) — gateway mới verify
  JWT + set header identity. Không tự bịa path.
- **JWT Bearer mọi request** (trừ `/auth/register`, `/auth/login`): lấy `access_token` từ **store
  Zustand** (`useAuthStore.getState().accessToken`) rồi set header `Authorization: Bearer <token>`.
  KHÔNG đọc token từ `localStorage` rải rác — 1 nguồn sự thật là store.
- **401 → logout/refresh tập trung** ở 1 chỗ (interceptor/wrapper `fetch`): thử refresh bằng
  `refresh_token` một lần; fail → `useAuthStore.getState().logout()` + điều hướng `/login`. KHÔNG
  nuốt 401 im lặng, KHÔNG retry vô hạn.
- **Khớp bảng API contract** trong `web/CLAUDE.md` từng dòng: đúng `path` + `method` + shape body/response.
  Auth login trả `{access_token, refresh_token, expires_in, token_type}`; lỗi luôn
  `{ error: { code, message } }` → parse `code` để map UX. `GET /users?ids=1,2,3` resolve tên/avatar.
- **Type TS strict**: khai báo type cho request + response khớp shape BE (`assigneeId`/`reporterId` là
  `number`; issue key là `string` toàn cục `PROJ-1`). Không `any`. Đặt type cạnh hook (colocate).
- **Đọc = `useQuery`**, **ghi = `useMutation`**. Không `useEffect` fetch tay (xem
  `vercel-react-best-practices`).
- **Arrow function** mặc định. Comment tiếng Việt cho business, Anh cho boilerplate.

## Query keys (có cấu trúc, phân cấp)
Key là mảng có thứ tự từ rộng → hẹp để `invalidateQueries` trúng đúng nhánh:
```ts
export const qk = {
  workspaces: ['workspaces'] as const,
  workspace: (id: number) => ['workspaces', id] as const,
  wsProjects: (id: number) => ['workspaces', id, 'projects'] as const,
  issues: (pid: number) => ['projects', pid, 'issues'] as const,
  issue: (key: string) => ['issues', key] as const,
} // invalidate ['workspaces'] sẽ cuốn cả detail + projects con
```

## Mẫu đọc (useQuery) + ghi (useMutation)
```ts
// đọc — loading/error TƯỜNG MINH, không render undefined
const useIssues = (pid: number) =>
  useQuery({
    queryKey: qk.issues(pid),
    queryFn: () => api.get<Issue[]>(`/projects/${pid}/issues`),
    enabled: Number.isFinite(pid), // đừng fetch khi id chưa có
  })

// ghi — thành công invalidate list để refetch, không tự mutate cache tay
const useCreateIssue = (pid: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateIssueInput) =>
      api.post<Issue>(`/projects/${pid}/issues`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.issues(pid) }),
  })
}
```
- Component đọc PHẢI xử lý cả 3 nhánh `isPending` / `isError` (dùng `error.code`) / `data` — không
  bỏ trống loading/error. Truyền `data` sang component trình bày (xem `[[react-component-ui]]`).
- Mutation: disable nút khi `isPending`, hiện lỗi từ `error`, KHÔNG optimistic trừ khi chắc rollback.

## Verify
- `web/` đã init: `pnpm -C web typecheck && pnpm -C web lint` (type khớp contract là điểm mấu chốt).
- `web/` CHƯA init: đọc lại `web/CLAUDE.md` **Khi khởi tạo FE** để dựng Vite + TanStack Query trước.
- Viết test data layer bằng MSW (mock gateway) → dùng `[[fe-test]]`. Xong gợi ý `/review`.
