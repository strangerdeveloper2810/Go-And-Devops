# Feature modules — tầng tích hợp FE ↔ Backend

Mỗi domain 1 file gồm `types + api + hooks` (TanStack Query) gọi qua **api-gateway**
(`/api/v1`). Type đã bám ĐÚNG shape response thật (kiểm chứng từ Go/Java handler).

## Cấu trúc
- `web/src/api.ts` — HttpClient sẵn có, đọc token từ `localStorage('access_token')`.
- `web/src/lib/session.ts` — lưu/xoá token + subscribe (login/logout/401).
- `web/src/lib/queryKeys.ts` — query key tập trung (dễ invalidate đúng nhánh).
- `web/src/features/<domain>.ts` — `auth`, `users`, `workspaces`, `issues`, `pages`, `files`.

## ⚠️ Casing KHÔNG đồng nhất giữa service (đã type đúng — nhớ khi thêm field)
| Service | Response | Request body |
|---|---|---|
| auth, workspace, file | `snake_case` | `snake_case` |
| **issue** (Java) | `camelCase` | `camelCase` |
| **page** | `snake_case` | `camelCase` (`workspaceId`, `contentHtml`, `parentId`) |

> Nên thống nhất snake_case ở backend sau này; hiện FE phải theo thực tế mỗi service.

## Env
`.env`: `PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` (rsbuild chỉ lộ biến prefix `PUBLIC_`).

## Auto-logout khi 401 (tuỳ chọn — thêm vào `web/src/api.ts`)
```ts
import { session } from './lib/session';
export const api = createClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  getToken: () => session.getAccessToken(),
  responseMiddleware: [
    (res) => { if (res.status === 401) session.clear(); return res; },
  ],
});
```

## Dùng (ví dụ)
```tsx
import { useLogin } from './features/auth';
import { useWorkspaces } from './features/workspaces';

const { mutate: login, isPending } = useLogin();
login({ email, password }); // token tự lưu vào session

const { data: workspaces, isLoading } = useWorkspaces();
```

## Bước tiếp theo (CHƯA làm — gợi ý)
1. **Router**: React Router v7 — `pnpm --filter web add react-router`.
2. **Form**: React Hook Form + Zod — `pnpm --filter web add react-hook-form zod @hookform/resolvers`.
3. **Test**: Vitest + Testing Library + MSW (skill `fe-test`) — thêm devDeps rồi mock gateway theo contract.
4. **XSS**: render `page.content_html` PHẢI qua DOMPurify (skill `react-component-ui`).
5. **UI lib**: đang dùng **MUI** — nhưng `web/CLAUDE.md` còn ghi shadcn/Tailwind + Vite. Cần chốt & cập nhật doc cho khớp.
