// Store màu giao diện (light/dark) — persist localStorage + set data-theme lên <html>.
// Không phụ thuộc React (dùng qua useSyncExternalStore). Mặc định dark.
export type ColorMode = 'light' | 'dark';

const KEY = 'pm-color-mode';
const listeners = new Set<() => void>();
const read = (): ColorMode => (localStorage.getItem(KEY) === 'light' ? 'light' : 'dark');
const apply = (m: ColorMode): void => document.documentElement.setAttribute('data-theme', m);

let current: ColorMode = read();
apply(current); // áp ngay lúc load (tránh nhấp nháy)

export const colorMode = {
  get: (): ColorMode => current,
  set: (m: ColorMode): void => {
    current = m;
    localStorage.setItem(KEY, m);
    apply(m);
    for (const l of listeners) l();
  },
  toggle: (): void => colorMode.set(current === 'dark' ? 'light' : 'dark'),
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
