import { createTheme } from '@mui/material/styles';

const palette = {
  primary: { main: '#2563eb', contrastText: '#fff' },
  secondary: { main: '#7c3aed', contrastText: '#fff' },
  error: { main: '#dc2626' },
  warning: { main: '#f59e0b' },
  info: { main: '#0ea5e9' },
  success: { main: '#16a34a' },
} as const;

const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 700 },
  h2: { fontWeight: 700 },
  h3: { fontWeight: 600 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
} as const;

const shape = { borderRadius: 8 };

/** Theme sáng mặc định */
export const theme = createTheme({
  cssVariables: true,
  palette: { ...palette, mode: 'light' },
  typography,
  shape,
});
