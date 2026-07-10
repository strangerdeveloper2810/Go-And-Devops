import { toApiError } from './errors';
import type { RequestConfig, QueryParams } from './types';

export interface ClientOptions {
  /** API base URL, e.g. 'http://localhost:8000/api/v1' */
  baseUrl: string;
  /** Hàm lấy JWT token (gọi mỗi request — hỗ trợ rotation) */
  getToken: () => string | null | Promise<string | null>;
  /** Called before each request, e.g. để set loading state */
  onRequest?: (url: string, init: RequestInit) => void;
}

export interface HttpClient {
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(path: string, config?: RequestConfig): Promise<T>;
  upload<T>(path: string, formData: FormData, config?: RequestConfig): Promise<T>;
}

//--------------------------------------------------------------------------------------------------
// Helpers
//--------------------------------------------------------------------------------------------------

/** Build query string, bỏ qua undefined/null values */
function toQueryString(params: QueryParams): string {
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
}

//--------------------------------------------------------------------------------------------------
// Client factory
//--------------------------------------------------------------------------------------------------

export function createClient(options: ClientOptions): HttpClient {
  const { baseUrl, getToken, onRequest } = options;

  async function request<T>(method: string, path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    const url = `${baseUrl}${path}${config?.params ? toQueryString(config.params) : ''}`;

    const headers: Record<string, string> = {};
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = { method, headers, signal: config?.signal };
    if (body instanceof FormData) {
      init.body = body;
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    onRequest?.(url, init);

    const res = await fetch(url, init);

    if (!res.ok) {
      throw await toApiError(res);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  return {
    get<T>(path: string, config?: RequestConfig) {
      return request<T>('GET', path, undefined, config);
    },
    post<T>(path: string, body?: unknown, config?: RequestConfig) {
      return request<T>('POST', path, body, config);
    },
    put<T>(path: string, body?: unknown, config?: RequestConfig) {
      return request<T>('PUT', path, body, config);
    },
    patch<T>(path: string, body?: unknown, config?: RequestConfig) {
      return request<T>('PATCH', path, body, config);
    },
    delete<T>(path: string, config?: RequestConfig) {
      return request<T>('DELETE', path, undefined, config);
    },
    upload<T>(path: string, formData: FormData, config?: RequestConfig) {
      return request<T>('POST', path, formData, config);
    },
  };
}
