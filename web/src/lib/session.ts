// Quản lý token phiên đăng nhập trong localStorage + phát tín hiệu khi phiên đổi (login/logout/401).
// Không phụ thuộc React → dùng được cả ở tầng api (fetch) lẫn component (qua useSyncExternalStore).

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = (): void => {
  for (const l of listeners) l();
};

export const session = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),

  /** Lưu token sau khi login thành công. */
  set: (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    emit();
  },

  /** Xoá token (logout chủ động hoặc bị 401). */
  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    emit();
  },

  isAuthenticated: (): boolean => localStorage.getItem(ACCESS_KEY) !== null,

  /** Đăng ký lắng nghe thay đổi phiên — trả về hàm huỷ (hợp useSyncExternalStore). */
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
