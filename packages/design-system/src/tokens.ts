// Design tokens — "Graphite Console". Hỗ trợ 2 mode (dark mặc định + light).
// palettes[mode] → dùng cho MUI theme; GlobalStyles inject CSS var theo [data-theme].
export const palettes = {
  dark: {
    bg: '#0E0E11',
    surface1: '#141418',
    surface2: '#1A1A20',
    surface3: '#22222B',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    textHi: '#ECECEE',
    textMid: '#9A9AA4',
    textLo: '#63636D',
    accent: '#C6F24E',
    accentDim: 'rgba(198,242,78,0.14)',
    accentContrast: '#0E0E11',
    red: '#F0616D',
    amber: '#E8B44A',
    blue: '#5B9DF9',
    green: '#57C98A',
    violet: '#A78BFA',
  },
  light: {
    bg: '#FBFBFA',
    surface1: '#FFFFFF',
    surface2: '#FFFFFF',
    surface3: '#F1F1EF',
    border: 'rgba(0,0,0,0.09)',
    borderStrong: 'rgba(0,0,0,0.17)',
    textHi: '#1A1A17',
    textMid: '#5F5F66',
    textLo: '#9A9AA2',
    accent: '#C6F24E',
    accentDim: 'rgba(163,214,54,0.22)',
    accentContrast: '#0E0E11',
    red: '#DC4C51',
    amber: '#B27A16',
    blue: '#2F6FE0',
    green: '#2E9E68',
    violet: '#7350E0',
  },
} as const;

export const radius = { sm: '6px', md: '8px', lg: '12px', pill: '999px' } as const;
export const font = {
  sans: "'Geist', -apple-system, 'Segoe UI', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
} as const;
export const motion = { ease: 'cubic-bezier(0.16, 1, 0.3, 1)', dur: '150ms' } as const;

// Giữ tương thích: `tokens.color` = palette dark.
export const tokens = { color: palettes.dark, radius, font, motion } as const;
export type Palette = (typeof palettes)['dark'];
