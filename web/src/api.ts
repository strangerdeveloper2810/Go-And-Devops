import { createClient } from '@pm-platform/api-client';

/**
 * API client for PM Platform gateway.
 * Gắn JWT tự động, parse lỗi theo format { error: { code, message } }.
 *
 * Usage với TanStack Query:
 * ```
 * const { data } = useQuery({
 *   queryKey: ['workspaces'],
 *   queryFn: () => api.get('/workspaces'),
 * });
 * ```
 */
export const api = createClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  getToken: () => localStorage.getItem('access_token'),
});
