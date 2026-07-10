import { styled } from '@mui/material/styles';
import { IssueKey } from '../../atoms/IssueKey';

export type ProjectRowProps = {
  name: string;
  projectKey: string;
  issueCount?: number;
  progress?: number; // 0-100
};

// Dòng project trong list-view: key · tên · thanh tiến độ · số issue. Dàn ngang, compact.
const Row = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
});
const Name = styled('div')({
  flex: 1,
  minWidth: 0,
  fontSize: 14,
  fontWeight: 550,
  color: 'var(--text-hi)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
// Thanh tiến độ rộng cố định bên phải (rãnh surface-3 + fill accent).
const Track = styled('div')({
  flexShrink: 0,
  width: 96,
  height: 6,
  borderRadius: 'var(--r-pill)',
  background: 'var(--surface-3)',
  overflow: 'hidden',
});
const Fill = styled('div', { shouldForwardProp: (p) => p !== 'pct' })<{ pct: number }>(
  ({ pct }) => ({
    width: `${pct}%`,
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 'var(--r-pill)',
    transition: 'width var(--dur) var(--ease)',
  }),
);
const Count = styled('div')({
  flexShrink: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text-mid)',
  minWidth: 64,
  textAlign: 'right',
});

// Dòng project compact cho list-view: mã key + tên (ellipsis) + tiến độ (nếu có) + số issue.
export const ProjectRow = ({ name, projectKey, issueCount, progress }: ProjectRowProps) => {
  // Kẹp % vào [0,100] để fill không tràn rãnh.
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <Row>
      <IssueKey>{projectKey}</IssueKey>
      <Name title={name}>{name}</Name>
      {progress != null ? (
        <Track>
          <Fill pct={pct} />
        </Track>
      ) : null}
      <Count>{issueCount ?? 0} issues</Count>
    </Row>
  );
};
