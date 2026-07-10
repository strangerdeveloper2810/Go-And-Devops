import { styled } from '@mui/material/styles';
import { IssueCard } from './IssueCard';
import { IssueColumn } from './IssueColumn';
import type { IssueCardData } from './types';

export interface BoardColumn {
  key: string;
  label: string;
  color: string;
  items: IssueCardData[];
}

const Board = styled('div')({
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  overflowX: 'auto',
  paddingBottom: 8,
});

// Board Kanban presentational — caller đã gom item theo cột.
export const IssueBoard = ({
  columns,
  onCardClick,
}: {
  columns: BoardColumn[];
  onCardClick?: (issue: IssueCardData) => void;
}) => (
  <Board>
    {columns.map((c) => (
      <IssueColumn key={c.key} label={c.label} color={c.color} count={c.items.length}>
        {c.items.map((it) => (
          <IssueCard key={it.id} issue={it} onClick={() => onCardClick?.(it)} />
        ))}
      </IssueColumn>
    ))}
  </Board>
);
