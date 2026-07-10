/** Cấu hình query params — value được serialize thành string */
export type QueryParams = Record<string, string | number | boolean | (string | number)[] | undefined>;

export interface RequestConfig {
  /** Query params tự động append vào URL */
  params?: QueryParams;
  /** AbortSignal từ TanStack Query (dùng cho request cancellation) */
  signal?: AbortSignal;
}
