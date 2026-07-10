import { styled } from '@mui/material/styles';
import { PriorityDot } from '../../atoms/PriorityDot';
import type { Priority } from './types';

const Row = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12.5,
  color: 'var(--text-mid)',
  textTransform: 'capitalize',
});

export const PriorityBadge = ({
  priority,
  showLabel = true,
}: { priority: Priority; showLabel?: boolean }) => (
  <Row>
    <PriorityDot priority={priority} />
    {showLabel ? priority : null}
  </Row>
);
