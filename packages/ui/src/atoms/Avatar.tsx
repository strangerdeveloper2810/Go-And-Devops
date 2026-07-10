import { styled } from '@mui/material/styles';

const Root = styled('span', { shouldForwardProp: (p) => p !== 'dim' })<{ dim: number }>(
  ({ dim }) => ({
    width: dim,
    height: dim,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: Math.round(dim * 0.42),
    color: '#0E0E11',
    userSelect: 'none',
    flexShrink: 0,
  }),
);

const COLORS = ['#C6F24E', '#5B9DF9', '#A78BFA', '#57C98A', '#E8B44A', '#F0616D'];
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

type Status = 'online' | 'offline' | 'busy';
const statusColor: Record<Status, string> = {
  online: 'var(--green)',
  offline: 'var(--text-lo)',
  busy: 'var(--red)',
};

const Wrap = styled('span')({ position: 'relative', display: 'inline-flex' });

// Chấm trạng thái góc dưới-phải, viền surface-2 để "cắt" khỏi avatar.
const StatusDot = styled('span', { shouldForwardProp: (p) => p !== 'dim' && p !== 'tone' })<{
  dim: number;
  tone: string;
}>(({ dim, tone }) => ({
  position: 'absolute',
  right: 0,
  bottom: 0,
  boxSizing: 'border-box',
  width: Math.max(7, Math.round(dim * 0.3)),
  height: Math.max(7, Math.round(dim * 0.3)),
  borderRadius: '50%',
  background: tone,
  border: '2px solid var(--surface-2)',
}));

// Avatar chữ cái đầu, màu nền suy định từ tên (ổn định). status? → chấm trạng thái.
export const Avatar = ({
  name,
  size = 26,
  status,
}: {
  name: string;
  size?: number;
  status?: Status;
}) => (
  <Wrap>
    <Root dim={size} style={{ background: COLORS[hash(name) % COLORS.length] }} title={name}>
      {initials(name)}
    </Root>
    {status ? <StatusDot dim={size} tone={statusColor[status]} /> : null}
  </Wrap>
);

// Chip "+N" khi số avatar vượt max — nền trung tính.
const Overflow = styled('span', { shouldForwardProp: (p) => p !== 'dim' })<{ dim: number }>(
  ({ dim }) => ({
    width: dim,
    height: dim,
    boxSizing: 'border-box',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: Math.round(dim * 0.36),
    color: 'var(--text-mid)',
    background: 'var(--surface-3)',
    border: '1px solid var(--border-strong)',
    userSelect: 'none',
    flexShrink: 0,
  }),
);

// Nhóm avatar xếp chồng (âm margin) — quá max thì hiện "+N". Ring surface-2 tách từng avatar.
export const AvatarGroup = ({
  avatars,
  max = 4,
  size = 26,
}: {
  avatars: { name: string }[];
  max?: number;
  size?: number;
}) => {
  const shown = avatars.slice(0, max);
  const extra = avatars.length - shown.length;
  const overlap = Math.round(size * 0.34);
  const ring = {
    borderRadius: '50%',
    boxShadow: '0 0 0 2px var(--surface-2)',
    display: 'inline-flex',
  } as const;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((a, i) => (
        <span
          key={`${a.name}-${i}`}
          style={{ ...ring, marginLeft: i === 0 ? 0 : -overlap, zIndex: shown.length - i }}
        >
          <Avatar name={a.name} size={size} />
        </span>
      ))}
      {extra > 0 ? (
        <span style={{ ...ring, marginLeft: -overlap, zIndex: 0 }}>
          <Overflow dim={size}>+{extra}</Overflow>
        </span>
      ) : null}
    </span>
  );
};
