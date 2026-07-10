import type { ApiError } from './errors';

/**
 * Result type — explicit error handling, không cần try/catch.
 * Hợp với TanStack Query: queryFn trả về Result<T>, check `ok` để phân nhánh.
 *
 * @example
 * const result = await api.safeGet<Workspace[]>('/workspaces');
 * if (result.ok) {
 *   console.log(result.value); // Workspace[]
 * } else {
 *   console.error(result.error.code, result.error.message);
 * }
 */
export type Result<T, E = ApiError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Tạo Result thành công */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Tạo Result lỗi */
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
