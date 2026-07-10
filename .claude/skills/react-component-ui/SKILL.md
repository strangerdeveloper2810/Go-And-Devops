---
name: react-component-ui
description: Use when dựng component React cho FE PM Platform — React 19 + TS strict, arrow function mặc định, shadcn/ui + Tailwind v4, a11y, props khớp contract BE, và BẮT BUỘC sanitize content_html (DOMPurify) trước dangerouslySetInnerHTML (chống XSS kiểu Confluence).
argument-hint: "<tên component> — <mô tả UI + data hiển thị>"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# React component UI

Dựng component React theo mô tả: **$ARGUMENTS**. Đọc `web/CLAUDE.md` (**Quy ước code** + **API
surface** để biết shape props) + `../CLAUDE.md` (page-service kiểu Confluence trả `content_html`)
TRƯỚC. Component chỉ **trình bày** — data lấy qua hook ở `[[react-data-fetching]]`, không tự gọi fetch.

## Quy tắc BẮT BUỘC
- **React 19 + TypeScript strict**. 1 file 1 component; colocate type + hook + test cạnh nhau.
- **Arrow function làm mặc định**; chỉ dùng `function` thường khi thật sự cần `this` binding (hiếm ở FE).
- **shadcn/ui + Tailwind v4**: ưu tiên primitive shadcn (Button, Dialog, Input...) + class Tailwind;
  KHÔNG viết CSS rời/inline-style trừ khi bất khả kháng. Compose primitive thay vì tự dựng lại.
- **Props type khớp contract BE** (`web/CLAUDE.md`): `assigneeId`/`reporterId` là `number` (resolve
  tên/avatar qua `GET /users?ids=`), issue key `string` (`PROJ-1`). Không `any`, không nới lỏng type
  để "cho chạy". Type props tường minh, phân biệt required/optional.
- **a11y**: dùng đúng element ngữ nghĩa (`button` cho hành động, không `div onClick`); mọi input có
  `label`/`aria-label`; ảnh có `alt`; focus nhìn thấy được; Dialog/Menu shadcn giữ nguyên `aria-*`
  của Radix, đừng gỡ.
- **Loại bỏ re-render thừa**: không tạo object/array/callback mới inline làm prop cho component con
  nặng (memo hoá khi cần — xem skill `vercel-react-best-practices`); key
  danh sách là **id ổn định**, KHÔNG dùng index; tránh state thừa suy ra được từ props.
- **Comment**: tiếng Việt cho business/domain, Anh cho boilerplate.

## XSS — content_html kiểu Confluence (KHÔNG BỎ QUA)
Page-service trả `content_html` là HTML do người dùng nhập → **HTML KHÔNG TIN CẬY**. Render thô =
stored XSS (chiếm token, mạo danh).
- **BẮT BUỘC sanitize bằng DOMPurify** ngay TRƯỚC `dangerouslySetInnerHTML`. KHÔNG BAO GIỜ nhét
  chuỗi HTML từ API thẳng vào `dangerouslySetInnerHTML`, `innerHTML`, hay `document.write`.
- Text thường (title, tên, comment plain) → để React render như text (đã tự escape), KHÔNG dùng
  `dangerouslySetInnerHTML` chỉ vì tiện.
```tsx
import DOMPurify from 'dompurify'

type PageBodyProps = { contentHtml: string }

// content_html = HTML do user nhập (untrusted) → sanitize trước khi render
const PageBody = ({ contentHtml }: PageBodyProps) => {
  const clean = DOMPurify.sanitize(contentHtml) // BẮT BUỘC, không skip
  return (
    <article
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
```

## Mẫu component trình bày (nhận data qua props)
```tsx
type IssueCardProps = { issue: Issue; assignee?: UserBrief; onOpen: (key: string) => void }

const IssueCard = ({ issue, assignee, onOpen }: IssueCardProps) => (
  <button
    type="button"
    onClick={() => onOpen(issue.key)}
    className="flex w-full items-center gap-2 rounded-md border p-3 text-left hover:bg-muted"
    aria-label={`Mở issue ${issue.key}`}
  >
    <span className="font-mono text-xs text-muted-foreground">{issue.key}</span>
    <span className="truncate">{issue.title}</span>
    {assignee && <Avatar name={assignee.name} src={assignee.avatarUrl} />}
  </button>
)
```
- Trạng thái loading/error thuộc về hook đọc (`[[react-data-fetching]]`) — component nhận data đã
  sẵn sàng, hoặc render skeleton/empty state rõ ràng khi cha truyền cờ.

## Verify
- `web/` đã init: `pnpm -C web typecheck && pnpm -C web lint` (a11y qua eslint-plugin-jsx-a11y nếu có).
- Kiểm tra grep: KHÔNG còn `dangerouslySetInnerHTML` nào thiếu `DOMPurify.sanitize` kề trên.
- Test render + tương tác (Testing Library) → dùng `[[fe-test]]`. Xong gợi ý `/review`.
