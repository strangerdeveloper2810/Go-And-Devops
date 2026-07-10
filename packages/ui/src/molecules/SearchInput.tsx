import { styled } from '@mui/material/styles';
import type { InputHTMLAttributes, ReactNode } from 'react';

const Box = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 10px',
  height: 36,
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  color: 'var(--text-lo)',
  transition: 'border-color var(--dur) var(--ease)',
  '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' },
});
const Inp = styled('input')({
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--text-hi)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13.5,
  '&::placeholder': { color: 'var(--text-lo)' },
});

type Props = InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; trailing?: ReactNode };
export const SearchInput = ({ icon, trailing, ...rest }: Props) => (
  <Box>
    {icon}
    <Inp {...rest} />
    {trailing}
  </Box>
);
