import { styled } from '@mui/material/styles';
import { Avatar, Button, Kbd } from '@pm-platform/ui';
import { Icon } from '@pm-platform/ui';
import { ThemeToggle } from './ThemeToggle';

const Bar = styled('header')({
  height: 56,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 20px',
  borderBottom: '1px solid var(--border)',
  background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
  backdropFilter: 'blur(10px)',
  position: 'sticky',
  top: 0,
  zIndex: 5,
});
const Title = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-hi)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});
const Sep = styled('span')({ color: 'var(--text-lo)' });
const Crumb = styled('span')({ color: 'var(--text-lo)', fontWeight: 500 });
const Spacer = styled('div')({ flex: 1 });
const SearchBtn = styled('button')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 8px 7px 12px',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  color: 'var(--text-lo)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  cursor: 'pointer',
  minWidth: 240,
  transition: 'border-color var(--dur) var(--ease)',
  '&:hover': { borderColor: 'var(--border-strong)' },
});

export const Topbar = ({
  title = 'Board',
  crumb = 'Apollo',
  user = 'Ada Lovelace',
  onNew,
}: {
  title?: string;
  crumb?: string;
  user?: string;
  onNew?: () => void;
}) => (
  <Bar>
    <Title>
      <Crumb>{crumb}</Crumb>
      <Sep>/</Sep>
      {title}
    </Title>
    <Spacer />
    <SearchBtn>
      <Icon name="search" size={15} />
      <span style={{ flex: 1, textAlign: 'left' }}>Jump to…</span>
      <Kbd>⌘K</Kbd>
    </SearchBtn>
    <ThemeToggle />
    <Button variant="primary" size="sm" onClick={onNew}>
      <Icon name="plus" size={15} />
      New
    </Button>
    <Avatar name={user} size={28} />
  </Bar>
);
