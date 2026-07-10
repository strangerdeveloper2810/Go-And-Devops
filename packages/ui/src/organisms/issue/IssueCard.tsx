import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';
import { IssueKey } from '../../atoms/IssueKey';
import { PriorityDot } from '../../atoms/PriorityDot';
import { Surface } from '../../atoms/Surface';
import { Tag } from '../../atoms/Tag';
import type { IssueCardData } from './types';

const Inner = styled('div')({ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 });
const Summary = styled('div')({
  fontSize: 13.5,
  fontWeight: 500,
  color: 'var(--text-hi)',
  lineHeight: 1.4,
});
const Row = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });
const Spacer = styled('div')({ flex: 1 });

export const IssueCard = ({ issue, onClick }: { issue: IssueCardData; onClick?: () => void }) => (
  <Surface interactive onClick={onClick}>
    <Inner>
      <Row>
        <IssueKey>{issue.issueKey}</IssueKey>
        <Spacer />
        <PriorityDot priority={issue.priority} />
      </Row>
      <Summary>{issue.summary}</Summary>
      <Row>
        {(issue.labels ?? []).slice(0, 2).map((l) => (
          <Tag key={l} tone="violet">
            {l}
          </Tag>
        ))}
        <Spacer />
        {issue.assigneeName ? <Avatar name={issue.assigneeName} size={22} /> : null}
      </Row>
    </Inner>
  </Surface>
);
