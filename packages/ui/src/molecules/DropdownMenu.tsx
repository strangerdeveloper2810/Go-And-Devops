import { styled } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type MenuItem = { label: string; icon?: ReactNode; onClick?: () => void; danger?: boolean };

const Root = styled('div')({ position: 'relative', display: 'inline-flex' });
const Trigger = styled('div')({ display: 'inline-flex' });
const Panel = styled('div')({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 20,
  minWidth: 180,
  padding: 5,
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-md)',
  boxShadow: '0 12px 32px -14px rgba(0, 0, 0, 0.5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});
const ItemBtn = styled('button', { shouldForwardProp: (p) => p !== 'danger' })<{
  danger?: boolean;
}>(({ danger }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  textAlign: 'left',
  padding: '7px 9px',
  border: 'none',
  borderRadius: 'var(--r-sm)',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: danger ? 'var(--red)' : 'var(--text-mid)',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  '&:hover': {
    background: danger ? 'color-mix(in srgb, var(--red) 14%, transparent)' : 'var(--surface-3)',
    color: danger ? 'var(--red)' : 'var(--text-hi)',
  },
}));

// Menu thả xuống — state open nội bộ (useState), click ngoài đóng. Presentational, KHÔNG giữ data.
export const DropdownMenu = ({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: MenuItem[];
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ra ngoài vùng Root.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <Root ref={ref}>
      <Trigger onClick={() => setOpen((o) => !o)}>{trigger}</Trigger>
      {open ? (
        <Panel role="menu">
          {items.map((it, i) => (
            <ItemBtn
              key={i}
              type="button"
              role="menuitem"
              danger={it.danger}
              onClick={() => {
                it.onClick?.();
                setOpen(false);
              }}
            >
              {it.icon}
              {it.label}
            </ItemBtn>
          ))}
        </Panel>
      ) : null}
    </Root>
  );
};
