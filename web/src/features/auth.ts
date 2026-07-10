// Auth: đăng ký / đăng nhập / danh tính hiện tại. Khớp response auth-service (snake_case).
// /me chỉ trả identity tối thiểu từ JWT (user_id, email) — muốn profile đầy đủ dùng users.getById.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';
import { session } from '../lib/session';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface Identity {
  user_id: number;
  email: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string; // 'Bearer'
}

export const authApi = {
  // POST /auth/login → token; tự lưu vào session để request sau đính Bearer.
  login: async (input: LoginInput): Promise<TokenPair> => {
    const token = await api.post<TokenPair>('/auth/login', input);
    session.set(token.access_token, token.refresh_token);
    return token;
  },
  // POST /auth/register → { user } (201). Không auto-login (login ở bước sau).
  register: (input: RegisterInput): Promise<AuthUser> =>
    api.post<{ user: AuthUser }>('/auth/register', input).then((r) => r.user),
  // GET /me → identity từ JWT.
  me: (): Promise<Identity> => api.get<Identity>('/me'),
};

// ── Hooks ─────────────────────────────────────────────────────────────────
export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
};

export const useRegister = () => useMutation({ mutationFn: authApi.register });

/** Identity hiện tại; chỉ gọi khi đã có token (tránh 401 lúc chưa đăng nhập). */
export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: session.isAuthenticated(),
    staleTime: 5 * 60_000,
  });

/** Đăng xuất: xoá token + clear cache query. */
export const useLogout = () => {
  const qc = useQueryClient();
  return () => {
    session.clear();
    qc.clear();
  };
};
