import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

const Zone = styled('div', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '28px 24px',
    textAlign: 'center',
    borderRadius: 'var(--r-lg)',
    border: `1.5px dashed ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
    background: active ? 'var(--accent-dim)' : 'var(--surface-1)',
    color: 'var(--text-mid)',
    cursor: 'pointer',
    transition: 'border-color var(--dur) var(--ease), background var(--dur) var(--ease)',
  }),
);
const Title = styled('div')({ fontSize: 14, fontWeight: 550, color: 'var(--text-hi)' });
const Hint = styled('div')({ fontSize: 12.5, color: 'var(--text-lo)' });

// Vùng kéo-thả upload (presentational — trạng thái + click do container điều khiển).
export const Dropzone = ({
  icon,
  title = 'Kéo thả file vào đây',
  hint = 'hoặc bấm để chọn',
  active,
  onClick,
}: {
  icon?: ReactNode;
  title?: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <Zone active={active} onClick={onClick}>
    {icon}
    <Title>{title}</Title>
    <Hint>{hint}</Hint>
  </Zone>
);
