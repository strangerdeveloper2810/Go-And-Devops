import { styled } from '@mui/material/styles';
import { IssueKey } from '../../atoms/IssueKey';
import { Surface } from '../../atoms/Surface';

// Props presentational thuần — không phụ thuộc app, tự định nghĩa.
type ProjectCardProps = {
  name: string;
  projectKey: string;
  issueCount?: number;
  progress?: number; // 0-100
  onClick?: () => void;
};

const Inner = styled('div')({
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});
const TopRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });
const Name = styled('div')({
  fontSize: 14.5,
  fontWeight: 600,
  color: 'var(--text-hi)',
  lineHeight: 1.35,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
// Rãnh nền của thanh tiến độ (nền chìm surface-3).
const Track = styled('div')({
  height: 6,
  borderRadius: 'var(--r-pill)',
  background: 'var(--surface-3)',
  overflow: 'hidden',
});
// Phần fill theo % — nền accent, animate width mượt.
const Fill = styled('div', { shouldForwardProp: (p) => p !== 'pct' })<{ pct: number }>(
  ({ pct }) => ({
    width: `${pct}%`,
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 'var(--r-pill)',
    transition: 'width var(--dur) var(--ease)',
  }),
);
const Count = styled('div')({ fontSize: 12, color: 'var(--text-mid)' });

// Card project: mã key + tên + thanh tiến độ + số issue. Presentational.
export const ProjectCard = ({
  name,
  projectKey,
  issueCount,
  progress,
  onClick,
}: ProjectCardProps) => {
  // Kẹp % vào [0,100] để fill không tràn.
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <Surface interactive onClick={onClick}>
      <Inner>
        <TopRow>
          <IssueKey>{projectKey}</IssueKey>
        </TopRow>
        <Name>{name}</Name>
        {progress != null ? (
          <Track>
            <Fill pct={pct} />
          </Track>
        ) : null}
        <Count>{issueCount ?? 0} issues</Count>
      </Inner>
    </Surface>
  );
};
