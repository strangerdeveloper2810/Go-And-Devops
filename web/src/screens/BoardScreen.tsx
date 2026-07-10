import { styled } from '@mui/material/styles';
import { IssueBoard } from '@pm-platform/ui';
import { demoColumns } from './demoData';

const Head = styled('div')({ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 });
const H = styled('h1')({
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-hi)',
});
const Sub = styled('span')({ fontSize: 13, color: 'var(--text-lo)' });

// Board demo presentational — dùng organism IssueBoard của design system.
export const BoardScreen = () => {
  const total = demoColumns.reduce((n, c) => n + c.items.length, 0);
  return (
    <div>
      <Head>
        <H>Board</H>
        <Sub>{total} issues · demo</Sub>
      </Head>
      <IssueBoard columns={demoColumns} />
    </div>
  );
};
