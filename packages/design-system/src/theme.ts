import { createTheme } from '@mui/material/styles';
import { font, palettes } from './tokens';

export type ColorMode = 'light' | 'dark';

// Tạo MUI theme theo mode. Component MUI bám palette này; component styled() tự viết
// tham chiếu CSS var (đổi theo [data-theme]) — cả hai đồng bộ khi toggle.
export const createAppTheme = (mode: ColorMode) => {
  const c = palettes[mode];
  return createTheme({
    cssVariables: true,
    palette: {
      mode,
      background: { default: c.bg, paper: c.surface2 },
      primary: { main: c.accent, contrastText: c.accentContrast },
      error: { main: c.red },
      warning: { main: c.amber },
      info: { main: c.blue },
      success: { main: c.green },
      text: { primary: c.textHi, secondary: c.textMid, disabled: c.textLo },
      divider: c.border,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: font.sans,
      fontSize: 14,
      h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.12 },
      h2: { fontSize: '1.3125rem', fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.2 },
      h3: { fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.012em' },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 550 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', color: c.textMid, lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 550, letterSpacing: 0 },
      caption: { fontSize: '0.75rem', color: c.textLo, letterSpacing: '0.01em' },
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${c.border}` } },
      },
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: c.surface3,
            border: `1px solid ${c.borderStrong}`,
            color: c.textHi,
            fontSize: 12,
            borderRadius: 6,
          },
        },
      },
    },
  });
};

// Mặc định dark (giữ export `theme` cũ để không vỡ import hiện có).
export const theme = createAppTheme('dark');
export type AppTheme = ReturnType<typeof createAppTheme>;
