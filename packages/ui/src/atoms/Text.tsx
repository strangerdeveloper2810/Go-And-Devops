import { styled } from '@mui/material/styles';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'caption' | 'mono';
const styles: Record<Variant, object> = {
  h1: {
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.022em',
    lineHeight: 1.12,
    color: 'var(--text-hi)',
  },
  h2: { fontSize: 21, fontWeight: 600, letterSpacing: '-0.018em', color: 'var(--text-hi)' },
  h3: { fontSize: 17, fontWeight: 600, letterSpacing: '-0.012em', color: 'var(--text-hi)' },
  body: { fontSize: 14, lineHeight: 1.55, color: 'var(--text-hi)' },
  muted: { fontSize: 13, color: 'var(--text-mid)' },
  caption: { fontSize: 12, color: 'var(--text-lo)', letterSpacing: '0.01em' },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-mid)' },
};

// Atom typography — chọn variant theo thang chữ của design system.
export const Text = styled('span', { shouldForwardProp: (p) => p !== 'variant' })<{
  variant?: Variant;
}>(({ variant = 'body' }) => ({ fontFamily: 'var(--font-sans)', ...styles[variant] }));
