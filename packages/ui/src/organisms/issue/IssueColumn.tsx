import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Badge } from '../../atoms/Badge';

const Col = styled('div')({
  width: 288,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});
const Head = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '2px 4px 4px',
});
const Dot = styled('span', { shouldForwardProp: (p) => p !== 'c' })<{ c: string }>(({ c }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: c,
}));
const Title = styled('span')({
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-mid)',
});

export const IssueColumn = ({
  label,
  color,
  count,
  children,
}: {
  label: string;
  color: string;
  count?: number;
  children?: ReactNode;
}) => (
  <Col>
    <Head>
      <Dot c={color} />
      <Title>{label}</Title>
      {count !== undefined ? <Badge>{count}</Badge> : null}
    </Head>
    {children}
  </Col>
);
