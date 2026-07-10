// Type cho biến môi trường rsbuild. rsbuild chỉ lộ ra client các biến prefix `PUBLIC_`.
// (Đặt trong .env: PUBLIC_API_BASE_URL=http://localhost:8000/api/v1)
interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
