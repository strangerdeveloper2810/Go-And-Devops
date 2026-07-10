import { styled } from '@mui/material/styles';

// Mã issue kiểu Jira (APOLLO-12) — mono, chip nhỏ.
export const IssueKey = styled('span')({
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: 'var(--text-mid)',
  padding: '2px 6px',
  borderRadius: 'var(--r-sm)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  whiteSpace: 'nowrap',
});
