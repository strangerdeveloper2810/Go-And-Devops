import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';
import { IssueKey } from '../../atoms/IssueKey';
import { Tag } from '../../atoms/Tag';
import { PriorityBadge } from './PriorityBadge';
import { StatusPill } from './StatusPill';
import type { Priority } from './types';

// Props presentational cho 1 dòng issue ở list-view (khác card ở board Kanban).
export interface IssueRowProps {
  issueKey: string;
  summary: string;
  status: string;
  priority: Priority;
  assigneeName?: string;
  labels?: string[];
  onClick?: () => void;
}

// Hàng compact 1 dòng ngang: hover sáng nền, có hairline dưới để xếp thành danh sách.
const Row = styled('div', { shouldForwardProp: (p) => p !== 'clickable' })<{ clickable?: boolean }>(
  ({ clickable }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 44,
    padding: '0 12px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    transition: 'background var(--dur) var(--ease)',
    ...(clickable && {
      cursor: 'pointer',
      '&:hover': { background: 'var(--surface-3)' },
    }),
  }),
);

// Cột key + status cố định bề rộng để nhiều dòng thẳng hàng.
const KeyCell = styled('span')({ flexShrink: 0 });
const StatusCell = styled('span')({ width: 104, flexShrink: 0 });
const Summary = styled('span')({
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  fontWeight: 500,
  color: 'var(--text-hi)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const Labels = styled('span')({ display: 'inline-flex', gap: 6, flexShrink: 0 });

export const IssueRow = ({
  issueKey,
  summary,
  status,
  priority,
  assigneeName,
  labels,
  onClick,
}: IssueRowProps) => (
  <Row clickable={!!onClick} onClick={onClick}>
    <KeyCell>
      <IssueKey>{issueKey}</IssueKey>
    </KeyCell>
    <StatusCell>
      <StatusPill status={status} />
    </StatusCell>
    <Summary>{summary}</Summary>
    <Labels>
      {(labels ?? []).slice(0, 2).map((l) => (
        <Tag key={l} tone="violet">
          {l}
        </Tag>
      ))}
    </Labels>
    <PriorityBadge priority={priority} showLabel={false} />
    {assigneeName ? <Avatar name={assigneeName} size={24} /> : null}
  </Row>
);
