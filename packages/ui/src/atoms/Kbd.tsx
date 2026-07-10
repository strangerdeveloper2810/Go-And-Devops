import { styled } from '@mui/material/styles';

// Phím tắt (⌘K) — dev-tool detail.
export const Kbd = styled('kbd')({
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  lineHeight: 1,
  color: 'var(--text-mid)',
  padding: '3px 6px',
  borderRadius: 'var(--r-sm)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderBottomWidth: 2,
  minWidth: 18,
  textAlign: 'center',
  display: 'inline-block',
});
