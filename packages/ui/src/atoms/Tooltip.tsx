import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

// Bọc phần tử con — hover/focus phần tử cha thì hiện bong bóng (CSS thuần, không state).
const Wrap = styled('span')({
  position: 'relative',
  display: 'inline-flex',
  '&:hover > .pm-tooltip, &:focus-within > .pm-tooltip': {
    opacity: 1,
    visibility: 'visible',
    transform: 'translateX(-50%) translateY(0)',
  },
});

// Bong bóng tooltip — nổi phía trên, có caret nhỏ, mờ dần khi ẩn.
const Bubble = styled('span')({
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%) translateY(4px)',
  opacity: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1,
  color: 'var(--text-hi)',
  background: 'var(--surface-3)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  padding: '6px 9px',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.28)',
  zIndex: 30,
  transition: 'opacity var(--dur) var(--ease), transform var(--dur) var(--ease)',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    borderWidth: 5,
    borderStyle: 'solid',
    borderColor: 'var(--surface-3) transparent transparent transparent',
  },
});

// Tooltip hover — label hiện khi rê chuột lên children. title= làm fallback cho a11y.
export const Tooltip = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <Wrap title={typeof label === 'string' ? label : undefined}>
    {children}
    <Bubble className="pm-tooltip" role="tooltip">
      {label}
    </Bubble>
  </Wrap>
);
