import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' });
const Label = styled('span')({ fontSize: 12, fontWeight: 550, color: 'var(--text-mid)' });
const Err = styled('span')({ fontSize: 12, color: 'var(--red)' });

// Wrapper form-field: label + control bất kỳ + error (khác TextField atom vốn gắn input sẵn).
export const Field = ({
  label,
  error,
  children,
}: { label?: ReactNode; error?: string; children: ReactNode }) => (
  <Wrap>
    {label ? <Label>{label}</Label> : null}
    {children}
    {error ? <Err>{error}</Err> : null}
  </Wrap>
);
