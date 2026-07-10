import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';

// Props presentational thuần — chỉ hiển thị, không dropdown thật.
type WorkspaceSwitcherProps = {
  current: string;
  onClick?: () => void;
};

// Nút chuyển workspace — mirror style WsBtn ở sidebar.
const Btn = styled('button')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text-hi)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 550,
  cursor: 'pointer',
  transition: 'border-color var(--dur) var(--ease)',
  '&:hover': { borderColor: 'var(--border-strong)' },
});
const Name = styled('span')({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const Spacer = styled('span')({ flex: 1 });
// Chevron mờ hơn chữ — gợi ý có menu.
const Caret = styled('span')({ display: 'inline-flex', color: 'var(--text-lo)' });

// Nút hiển thị workspace hiện tại + chevron. Presentational (không mở menu).
export const WorkspaceSwitcher = ({ current, onClick }: WorkspaceSwitcherProps) => (
  <Btn onClick={onClick}>
    <Avatar name={current} size={22} />
    <Name>{current}</Name>
    <Spacer />
    <Caret>
      <Icon name="chevron" size={16} />
    </Caret>
  </Btn>
);
