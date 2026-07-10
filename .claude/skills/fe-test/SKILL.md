---
name: fe-test
description: Use when writing tests for React/TypeScript FE của PM Platform (component, hook TanStack Query, form) — scaffold Vitest + Testing Library + MSW mock gateway theo API contract, test hành vi (render/interaction/loading/error) KHÔNG test implementation detail. FE dùng khi đã init web/.
argument-hint: "<component|hook|form> — <thứ cần test>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# FE test (Vitest + Testing Library + MSW)

Viết test React theo mô tả: **$ARGUMENTS**. Đọc `web/CLAUDE.md` (Stack, **API surface**, quy ước code)
+ `../CLAUDE.md` (kiến trúc gateway) trước. **FE có thể chưa init** → bám định hướng `web/CLAUDE.md`
(Vite + React 19 + TS + TanStack Query + RHF/Zod + Testing Library). Skill này = **kiến thức + scaffold
"làm thế nào"**; khi cần *dispatch* viết trọn bộ test cho 1 thay đổi → dùng agent `test-author`
(tự viết → chạy → sửa tới xanh). Skill bổ trợ mẫu + checklist.

## Quy tắc BẮT BUỘC
- **Test hành vi người dùng, KHÔNG test implementation detail**: query theo role/label/text (`getByRole`,
  `findByText`), tương tác qua `userEvent`. KHÔNG assert state nội bộ / tên hàm / số lần render / class CSS.
- **Mock backend bằng MSW** (`msw` + `setupServer`), KHÔNG mock `fetch`/`axios` tay. Handler MSW phải **khớp
  API contract** ở `web/CLAUDE.md`: base `/api/v1`, header `Authorization: Bearer <token>`, lỗi trả
  `{"error":{"code","message"}}` + status chuẩn (400/401/403/404/409).
- **Cover 3 trạng thái async**: **loading** (skeleton/spinner hiện), **success** (data render), **error**
  (MSW trả 4xx/5xx → UI hiện message, map theo `error.code`). Bắt buộc có case error.
- **Colocate**: `Component.test.tsx` cạnh `Component.tsx`. Arrow function mặc định (đồng bộ quy ước FE).
- `await findBy...` cho phần async (đợi query resolve); KHÔNG `getBy` ngay sau khi trigger fetch (chưa có DOM → fail).

## Setup MSW (một lần, `src/test/`)
```ts
// src/test/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
export const server = setupServer(
  http.get('/api/v1/workspaces', () =>
    HttpResponse.json([{ id: 1, name: 'PM' }])),        // success mặc định
)
// src/test/setup.ts (vitest setupFiles)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```
Override per-test cho case lỗi: `server.use(http.get('/api/v1/workspaces', () =>
new HttpResponse(JSON.stringify({ error: { code: 'FORBIDDEN', message: '...' } }), { status: 403 })))`.

## Component test (render + interaction + trạng thái)
```tsx
it('hiện lỗi khi gateway trả 403', async () => {
  server.use(http.get('/api/v1/workspaces', () =>
    HttpResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 })))
  render(<WorkspaceList />, { wrapper: makeQueryWrapper() })
  expect(await screen.findByText(/không có quyền/i)).toBeInTheDocument()
})
```

## Hook TanStack Query (cache / invalidate)
- Bọc trong `QueryClientProvider` (`new QueryClient({ defaultOptions: { queries: { retry: false } } })` —
  tắt retry để case error không treo). Dùng `renderHook` + `waitFor(() => result.current.isSuccess)`.
- Mutation: sau `mutateAsync`, assert query liên quan được **invalidate/refetch** (MSW trả data mới → UI cập nhật).

## Form (React Hook Form + Zod)
- Submit trống → assert **message validate** hiện (Zod), KHÔNG gọi API (MSW handler không bị hit).
- Submit hợp lệ → assert request body đúng shape contract; server 409 (vd email trùng) → hiện lỗi field/toast.

## Chạy & verify
```
npm test -- <pattern>        # vd: npm test -- WorkspaceList
npm test -- --run            # chạy 1 lượt (CI mode, không watch)
```
Xanh toàn bộ + không `console.error` MSW "unhandled request" (nghĩa là handler đã khớp contract).

Liên quan: fetch/cache TanStack Query → `[[react-data-fetching]]`; render/component + accessibility (query theo role) → `[[react-component-ui]]`.
