import { styled } from '@mui/material/styles';
import { Fragment } from 'react';

type Crumb = { label: string; onClick?: () => void };

const Nav = styled('nav')({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
});
const Sep = styled('span')({ color: 'var(--text-lo)', userSelect: 'none', fontSize: 13 });
const Item = styled('button', { shouldForwardProp: (p) => p !== 'current' })<{ current?: boolean }>(
  ({ current }) => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    cursor: current ? 'default' : 'pointer',
    color: current ? 'var(--text-hi)' : 'var(--text-mid)',
    fontWeight: current ? 600 : 500,
    transition: 'color var(--dur) var(--ease)',
    '&:hover': { color: 'var(--text-hi)' },
  }),
);

// Breadcrumb phân cấp — ngăn cách bằng '/', item cuối = trang hiện tại (không click).
export const Breadcrumb = ({ items }: { items: Crumb[] }) => (
  <Nav aria-label="Breadcrumb">
    {items.map((it, i) => {
      const last = i === items.length - 1;
      return (
        <Fragment key={i}>
          <Item
            type="button"
            current={last}
            aria-current={last ? 'page' : undefined}
            onClick={last ? undefined : it.onClick}
          >
            {it.label}
          </Item>
          {last ? null : <Sep>/</Sep>}
        </Fragment>
      );
    })}
  </Nav>
);
