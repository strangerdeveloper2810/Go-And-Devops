import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';

const spin = keyframes({ to: { transform: 'rotate(360deg)' } });

export const Spinner = styled('span', { shouldForwardProp: (p) => p !== 'size' })<{
  size?: number;
}>(({ size = 16 }) => ({
  width: size,
  height: size,
  display: 'inline-block',
  borderRadius: '50%',
  border: '2px solid var(--border-strong)',
  borderTopColor: 'var(--accent)',
  animation: `${spin} 0.7s linear infinite`,
}));
