import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';
import { IssueKey } from '../../atoms/IssueKey';
import { Surface } from '../../atoms/Surface';
import { LabelChip } from './LabelChip';
import { PriorityBadge } from './PriorityBadge';
import { StatusPill } from './StatusPill';
import type { Priority } from './types';

// Props presentational cho panel chi tiết 1 issue (bên phải màn detail).
export interface IssueDetailPanelProps {
  issueKey: string;
  summary: string;
  description?: string;
  status: string;
  priority: Priority;
  assigneeName?: string;
  labels?: string[];
}

const Inner = styled('div')({ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 });
const Head = styled('div')({ display: 'flex', alignItems: 'center', gap: 10 });
const Title = styled('h2')({
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '-0.018em',
  lineHeight: 1.3,
  color: 'var(--text-hi)',
});
const Desc = styled('p')({ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)' });

// Lưới meta: nhãn (mờ, uppercase) bên trái · giá trị bên phải.
const MetaGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '12px 20px',
  alignItems: 'center',
});
const MetaLabel = styled('span')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
});
const MetaValue = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 13.5,
  color: 'var(--text-hi)',
});
const Empty = styled('span')({ color: 'var(--text-lo)' });

export const IssueDetailPanel = ({
  issueKey,
  summary,
  description,
  status,
  priority,
  assigneeName,
  labels,
}: IssueDetailPanelProps) => (
  <Surface>
    <Inner>
      <Head>
        <IssueKey>{issueKey}</IssueKey>
        <StatusPill status={status} />
      </Head>
      <Title>{summary}</Title>
      {description ? <Desc>{description}</Desc> : null}
      <MetaGrid>
        <MetaLabel>Priority</MetaLabel>
        <MetaValue>
          <PriorityBadge priority={priority} />
        </MetaValue>
        <MetaLabel>Assignee</MetaLabel>
        <MetaValue>
          {assigneeName ? (
            <>
              <Avatar name={assigneeName} size={22} />
              <span>{assigneeName}</span>
            </>
          ) : (
            <Empty>Unassigned</Empty>
          )}
        </MetaValue>
        <MetaLabel>Labels</MetaLabel>
        <MetaValue>
          {(labels ?? []).length > 0 ? (
            (labels ?? []).map((l) => <LabelChip key={l} label={l} />)
          ) : (
            <Empty>—</Empty>
          )}
        </MetaValue>
      </MetaGrid>
    </Inner>
  </Surface>
);
