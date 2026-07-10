import { styled } from '@mui/material/styles';

type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

const prioColor: Record<Priority, string> = {
  highest: 'var(--red)',
  high: 'var(--red)',
  medium: 'var(--amber)',
  low: 'var(--blue)',
  lowest: 'var(--text-lo)',
};

// Chấm priority có glow nhẹ (0 0 0 3px halo).
export const PriorityDot = styled('span', { shouldForwardProp: (p) => p !== 'priority' })<{
  priority?: Priority;
}>(({ priority = 'medium' }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
  background: prioColor[priority],
  boxShadow: `0 0 0 3px color-mix(in srgb, ${prioColor[priority]} 18%, transparent)`,
}));
