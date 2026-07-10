import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

const Box = styled('div')({
  display: 'flex',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  // Viền trái accent-dim nhấn mạnh — dày hơn để nổi trên surface-2.
  borderLeft: '3px solid var(--accent-dim)',
});
const IconWrap = styled('div')({ flexShrink: 0, color: 'var(--accent)', marginTop: 1 });
const Body = styled('div')({ flex: 1, minWidth: 0 });
const Title = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-hi)',
  marginBottom: 4,
});
const Content = styled('div')({ fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)' });

// Box ghi chú/tip nhấn mạnh — nền surface-2 + viền accent-dim trái, icon tuỳ chọn.
export const Callout = ({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <Box>
    {icon ? <IconWrap>{icon}</IconWrap> : null}
    <Body>
      <Title>{title}</Title>
      <Content>{children}</Content>
    </Body>
  </Box>
);
