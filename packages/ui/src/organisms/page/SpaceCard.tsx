import { styled } from '@mui/material/styles';
import { IssueKey } from '../../atoms/IssueKey';
import { Surface } from '../../atoms/Surface';

// Props presentational cho thẻ Space (Confluence/wiki) — không dính model backend.
export interface SpaceCardProps {
  name: string;
  spaceKey: string; // vd 'ENG', 'DESIGN'
  pageCount?: number;
  active?: boolean;
  onClick?: () => void;
}

// Bọc Surface: thêm viền accent + nền khi active (lọc prop `active` khỏi DOM).
const Card = styled(Surface, { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) =>
    active
      ? {
          borderColor: 'var(--accent)',
          background: 'var(--surface-3)',
        }
      : {},
);

const Inner = styled('div')({ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 });
const Row = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });
const Name = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-hi)',
  lineHeight: 1.35,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const Count = styled('div')({ fontSize: 12, color: 'var(--text-lo)' });

export const SpaceCard = ({ name, spaceKey, pageCount, active, onClick }: SpaceCardProps) => (
  <Card interactive active={active} onClick={onClick}>
    <Inner>
      <Row>
        <IssueKey>{spaceKey}</IssueKey>
      </Row>
      <Name>{name}</Name>
      {pageCount !== undefined ? <Count>{pageCount} pages</Count> : null}
    </Inner>
  </Card>
);
