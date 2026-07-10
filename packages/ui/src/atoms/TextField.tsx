import { styled } from '@mui/material/styles';
import type { InputHTMLAttributes, ReactNode } from 'react';

const Field = styled('label')({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' });
const LabelText = styled('span')({ fontSize: 12, fontWeight: 550, color: 'var(--text-mid)' });
const Input = styled('input')({
  width: '100%',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-hi)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  padding: '10px 12px',
  outline: 'none',
  transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
  '&::placeholder': { color: 'var(--text-lo)' },
  '&:hover': { borderColor: 'var(--border-strong)' },
  '&:focus': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' },
});

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode };

export const TextField = ({ label, ...rest }: Props) => (
  <Field>
    {label ? <LabelText>{label}</LabelText> : null}
    <Input {...rest} />
  </Field>
);
