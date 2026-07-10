import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

const Wrap = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '56px 24px',
  textAlign: 'center',
});
const Title = styled('div')({ fontSize: 15, fontWeight: 600, color: 'var(--text-hi)' });
const Desc = styled('div')({
  fontSize: 13,
  color: 'var(--text-lo)',
  maxWidth: 340,
  lineHeight: 1.5,
});

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <Wrap>
    {icon}
    <Title>{title}</Title>
    {description ? <Desc>{description}</Desc> : null}
    {action}
  </Wrap>
);
