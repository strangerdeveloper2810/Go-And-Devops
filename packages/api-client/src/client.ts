import { toApiError, ApiError } from './errors';
import { applyRequestMiddleware, applyResponseMiddleware } from './middleware';
import type { RequestMiddleware, ResponseMiddleware } from './middleware';
import { Ok, Err } from './result';
import type { Result } from './result';
import type { RequestConfig, QueryParams } from './types';

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------

export interface ClientOptions {
  /** API base URL, e.g. 'http://localhost:8000/api/v1' */
  baseUrl: string;
  /** Hàm lấy JWT token (gọi mỗi request — hỗ trợ rotation) */
  getToken: () => string | null | Promise<string | null>;
  /** Request interceptors (Chain of Responsibility) */
  requestMiddleware?: readonly RequestMiddleware[];
  /** Response interceptors (Chain of Responsibility) */
  responseMiddleware?: readonly ResponseMiddleware[];
  /** Called before each request, e.g. để set loading state */
  onRequest?: (url: string, init: RequestInit) => void;
}

export interface HttpClient {
  /** Throw ApiError on failure */
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(path: string, config?: RequestConfig): Promise<T>;
  upload<T>(path: string, formData: FormData, config?: RequestConfig): Promise<T>;

  /** Return Result<T> — không throw, explicit error handling */
  safeGet<T>(path: string, config?: RequestConfig): Promise<Result<T>>;
  safePost<T>(path: string, body?: unknown, config?: RequestConfig): Promise<Result<T>>;
  safePut<T>(path: string, body?: unknown, config?: RequestConfig): Promise<Result<T>>;
  safePatch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<Result<T>>;
  safeDelete<T>(path: string, config?: RequestConfig): Promise<Result<T>>;
  safeUpload<T>(path: string, formData: FormData, config?: RequestConfig): Promise<Result<T>>;
}

//--------------------------------------------------------------------------------------------------
// Helpers
//--------------------------------------------------------------------------------------------------

/** Build query string, bỏ qua undefined/null values */
const toQueryString = (params: QueryParams): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

//--------------------------------------------------------------------------------------------------
// Client factory
//--------------------------------------------------------------------------------------------------

export const createClient = (options: ClientOptions): HttpClient => {
  const {
    baseUrl,
    getToken,
    requestMiddleware = [],
    responseMiddleware = [],
    onRequest,
  } = options;

  const request = async <T>(method: string, path: string, body?: unknown, config?: RequestConfig): Promise<T> => {
    let url = `${baseUrl}${path}${config?.params ? toQueryString(config.params) : ''}`;

    const headers: Record<string, string> = {};
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let init: RequestInit = { method, headers, signal: config?.signal };
    if (body instanceof FormData) {
      init.body = body;
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    // Chain of Responsibility: request middleware
    [url, init] = await applyRequestMiddleware(url, init, requestMiddleware);
    onRequest?.(url, init);

    let res = await fetch(url, init);

    // Chain of Responsibility: response middleware
    res = await applyResponseMiddleware(res, responseMiddleware);

    if (!res.ok) {
      throw await toApiError(res);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  };

  /** Wraps a throwing request into a Result<T> (Either pattern) */
  const safe = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
    try {
      return Ok(await fn());
    } catch (error) {
      return Err(ApiError.from(error));
    }
  };

  return {
    // Throw-based (backward-compatible)
    get: <T>(path: string, config?: RequestConfig) =>
      request<T>('GET', path, undefined, config),
    post: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      request<T>('POST', path, body, config),
    put: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      request<T>('PUT', path, body, config),
    patch: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      request<T>('PATCH', path, body, config),
    delete: <T>(path: string, config?: RequestConfig) =>
      request<T>('DELETE', path, undefined, config),
    upload: <T>(path: string, formData: FormData, config?: RequestConfig) =>
      request<T>('POST', path, formData, config),

    // Result-based (Either pattern)
    safeGet: <T>(path: string, config?: RequestConfig) =>
      safe(() => request<T>('GET', path, undefined, config)),
    safePost: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      safe(() => request<T>('POST', path, body, config)),
    safePut: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      safe(() => request<T>('PUT', path, body, config)),
    safePatch: <T>(path: string, body?: unknown, config?: RequestConfig) =>
      safe(() => request<T>('PATCH', path, body, config)),
    safeDelete: <T>(path: string, config?: RequestConfig) =>
      safe(() => request<T>('DELETE', path, undefined, config)),
    safeUpload: <T>(path: string, formData: FormData, config?: RequestConfig) =>
      safe(() => request<T>('POST', path, formData, config)),
  };
};
