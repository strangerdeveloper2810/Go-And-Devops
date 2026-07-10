import { styled } from '@mui/material/styles';
import { Avatar } from '@pm-platform/ui';
import { Icon, type IconName } from '@pm-platform/ui';

const Aside = styled('aside')({
  width: 240,
  flexShrink: 0,
  height: '100%',
  background: 'var(--surface-1)',
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
});
const Brand = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '18px 18px 6px',
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '-0.01em',
});
const Diamond = styled('span')({
  width: 24,
  height: 24,
  borderRadius: 7,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 800,
  boxShadow: '0 0 24px var(--accent-dim)',
});
const WsBtn = styled('button')({
  margin: '10px 12px 6px',
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
const Nav = styled('nav')({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 10px',
  flex: 1,
});
const SectionLabel = styled('div')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
  padding: '10px 10px 4px',
});
const Item = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 'var(--r-md)',
    border: 'none',
    background: active ? 'var(--surface-3)' : 'transparent',
    color: active ? 'var(--text-hi)' : 'var(--text-mid)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    position: 'relative',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
    '&:hover': { background: 'var(--surface-2)', color: 'var(--text-hi)' },
    ...(active && {
      '&::before': {
        content: '""',
        position: 'absolute',
        left: -10,
        top: 8,
        bottom: 8,
        width: 2.5,
        borderRadius: 2,
        background: 'var(--accent)',
      },
    }),
  }),
);
const Foot = styled('div')({
  padding: 12,
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});
const UserName = styled('div')({
  fontSize: 13,
  fontWeight: 550,
  color: 'var(--text-hi)',
  lineHeight: 1.2,
});
const UserMeta = styled('div')({ fontSize: 11, color: 'var(--text-lo)' });

const NAV: { key: string; label: string; icon: IconName }[] = [
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'issues', label: 'Issues', icon: 'inbox' },
  { key: 'pages', label: 'Pages', icon: 'doc' },
  { key: 'files', label: 'Files', icon: 'file' },
  { key: 'members', label: 'Members', icon: 'users' },
];

export const Sidebar = ({
  active = 'board',
  onNavigate,
  user = 'Ada Lovelace',
  workspace = 'Apollo',
}: {
  active?: string;
  onNavigate?: (key: string) => void;
  user?: string;
  workspace?: string;
}) => (
  <Aside>
    <Brand>
      <Diamond>◆</Diamond>
      pm
    </Brand>
    <WsBtn>
      <span style={{ flex: 1, textAlign: 'left' }}>{workspace}</span>
      <span style={{ color: 'var(--text-lo)', display: 'inline-flex' }}>
        <Icon name="chevron" size={14} />
      </span>
    </WsBtn>
    <Nav>
      <SectionLabel>Workspace</SectionLabel>
      {NAV.map((n) => (
        <Item key={n.key} active={active === n.key} onClick={() => onNavigate?.(n.key)}>
          <Icon name={n.icon} size={17} />
          {n.label}
        </Item>
      ))}
      <div style={{ flex: 1 }} />
      <Item active={active === 'design'} onClick={() => onNavigate?.('design')}>
        <Icon name="palette" size={17} />
        Design system
      </Item>
    </Nav>
    <Foot>
      <Avatar name={user} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <UserName>{user}</UserName>
        <UserMeta>Online</UserMeta>
      </div>
    </Foot>
  </Aside>
);
