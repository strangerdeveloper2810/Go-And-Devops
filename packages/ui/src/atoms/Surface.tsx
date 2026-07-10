import { styled } from '@mui/material/styles';

type SurfaceProps = { interactive?: boolean; inset?: boolean };

// Khối bề mặt: card (surface-2) hoặc inset (surface-1), hairline border, hover nâng nhẹ.
export const Surface = styled('div', {
  shouldForwardProp: (p) => p !== 'interactive' && p !== 'inset',
})<SurfaceProps>(({ interactive, inset }) => ({
  background: inset ? 'var(--surface-1)' : 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  transition:
    'border-color var(--dur) var(--ease), background var(--dur) var(--ease), transform var(--dur) var(--ease)',
  ...(interactive && {
    cursor: 'pointer',
    '&:hover': {
      borderColor: 'var(--border-strong)',
      background: 'var(--surface-3)',
      transform: 'translateY(-1px)',
    },
  }),
}));
