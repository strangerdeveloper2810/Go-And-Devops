import { styled } from '@mui/material/styles';
import { Icon } from '../../atoms/Icon';

export type UploadItemProps = {
  name: string;
  progress: number; // 0-100
};

const Root = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
});
const Head = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });
const Name = styled('div')({
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 550,
  color: 'var(--text-hi)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
// % ở bên phải — mono cho thẳng cột, đổi màu xanh khi đã xong.
const Pct = styled('div', { shouldForwardProp: (p) => p !== 'done' })<{ done: boolean }>(
  ({ done }) => ({
    flexShrink: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: done ? 'var(--green)' : 'var(--text-mid)',
  }),
);

// Rãnh nền + phần fill của thanh tiến độ upload (mirror pattern ProjectCard).
const Track = styled('div')({
  height: 6,
  borderRadius: 'var(--r-pill)',
  background: 'var(--surface-3)',
  overflow: 'hidden',
});
const Fill = styled('div', { shouldForwardProp: (p) => p !== 'pct' && p !== 'done' })<{
  pct: number;
  done: boolean;
}>(({ pct, done }) => ({
  width: `${pct}%`,
  height: '100%',
  background: done ? 'var(--green)' : 'var(--accent)',
  borderRadius: 'var(--r-pill)',
  transition: 'width var(--dur) var(--ease)',
}));

// Item 1 file đang upload: tên + % + thanh tiến độ. Xong (100%) → hiện tick xanh.
export const UploadItem = ({ name, progress }: UploadItemProps) => {
  // Kẹp % vào [0,100] để fill không tràn.
  const pct = Math.max(0, Math.min(100, progress));
  const done = pct >= 100;
  return (
    <Root>
      <Head>
        <Name title={name}>{name}</Name>
        <Pct done={done}>{done ? <Icon name="check" size={14} /> : `${Math.round(pct)}%`}</Pct>
      </Head>
      <Track>
        <Fill pct={pct} done={done} />
      </Track>
    </Root>
  );
};
