import { styled } from '@mui/material/styles';

// Badge đếm/nhãn nhỏ (mono) — vd số lượng trong cột board.
export const Badge = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 18,
  height: 18,
  padding: '0 6px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--text-lo)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-pill)',
});
