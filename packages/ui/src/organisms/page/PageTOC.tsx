import { styled } from '@mui/material/styles';

// 1 mục trong mục lục: id trỏ tới heading, level 1..3 quyết định độ indent.
export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

// Props presentational cho mục lục (table of contents) của 1 trang wiki.
export interface PageTOCProps {
  items: TOCItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

const Nav = styled('nav')({ display: 'flex', flexDirection: 'column', gap: 1 });
const Caption = styled('div')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
  margin: '0 0 8px',
});

// Link cuộn tới heading — viền trái đổi sang accent khi active.
const Link = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    appearance: 'none',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderLeft: '2px solid',
    borderLeftColor: active ? 'var(--accent)' : 'var(--border)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    lineHeight: 1.4,
    padding: '5px 10px',
    color: active ? 'var(--text-hi)' : 'var(--text-mid)',
    transition: 'color var(--dur) var(--ease), border-color var(--dur) var(--ease)',
    '&:hover': { color: 'var(--text-hi)', borderLeftColor: 'var(--border-strong)' },
  }),
);

export const PageTOC = ({ items, activeId, onSelect }: PageTOCProps) => (
  <Nav aria-label="Table of contents">
    <Caption>On this page</Caption>
    {items.map((it) => (
      <Link
        key={it.id}
        active={it.id === activeId}
        onClick={() => onSelect?.(it.id)}
        style={{ paddingLeft: 10 + Math.max(0, it.level - 1) * 14 }}
      >
        {it.title}
      </Link>
    ))}
  </Nav>
);
