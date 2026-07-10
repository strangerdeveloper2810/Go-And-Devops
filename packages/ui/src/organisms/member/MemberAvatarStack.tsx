import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';

export type MemberAvatarStackProps = {
  names: string[];
  max?: number; // số avatar hiển thị tối đa trước khi gộp "+N"
};

// Xếp chồng: mỗi item đè lên item trước (marginLeft âm). Viền nền bg tách các avatar.
const Stack = styled('div')({ display: 'inline-flex', alignItems: 'center' });
const Item = styled('span')({
  display: 'inline-flex',
  borderRadius: '50%',
  boxShadow: '0 0 0 2px var(--bg)',
  '&:not(:first-of-type)': { marginLeft: -8 },
});
// Ô "+N" cho phần dư — hình tròn nền surface-3, chữ mono.
const More = styled('span', { shouldForwardProp: (p) => p !== 'dim' })<{ dim: number }>(
  ({ dim }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: dim,
    height: dim,
    marginLeft: -8,
    borderRadius: '50%',
    background: 'var(--surface-3)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 0 0 2px var(--bg)',
    fontFamily: 'var(--font-mono)',
    fontSize: Math.round(dim * 0.36),
    fontWeight: 600,
    color: 'var(--text-mid)',
  }),
);

// Nhóm avatar xếp chồng + "+N" nếu vượt max. Presentational (vd hiển thị thành viên project/issue).
export const MemberAvatarStack = ({ names, max = 4 }: MemberAvatarStackProps) => {
  const size = 26;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <Stack>
      {shown.map((name, i) => (
        <Item key={`${name}-${i}`}>
          <Avatar name={name} size={size} />
        </Item>
      ))}
      {rest > 0 ? <More dim={size}>+{rest}</More> : null}
    </Stack>
  );
};
