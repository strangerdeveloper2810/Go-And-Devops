import { styled } from '@mui/material/styles';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'color-mix(in srgb, var(--bg) 55%, rgba(0, 0, 0, 0.6))',
  backdropFilter: 'blur(3px)',
});
const Panel = styled('div')({
  width: '100%',
  maxWidth: 460,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-lg)',
  boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.6)',
  overflow: 'hidden',
});
const Head = styled('header')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 18px',
  borderBottom: '1px solid var(--border)',
});
const Title = styled('h3')({ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-hi)' });
const Close = styled('button')({
  border: 'none',
  background: 'transparent',
  color: 'var(--text-lo)',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  padding: 2,
  borderRadius: 'var(--r-sm)',
  '&:hover': { color: 'var(--text-hi)', background: 'var(--surface-3)' },
});
const Body = styled('div')({
  padding: 18,
  overflowY: 'auto',
  fontSize: 13.5,
  lineHeight: 1.55,
  color: 'var(--text-mid)',
});
const Foot = styled('footer')({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '12px 18px',
  borderTop: '1px solid var(--border)',
});

// Modal overlay + panel giữa màn — đóng khi click nền hoặc nhấn ESC.
export const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  // Nghe phím ESC khi modal mở.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true">
      {/* Chặn click lan lên overlay để không đóng khi bấm trong panel. */}
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{title}</Title>
          <Close type="button" aria-label="Đóng" onClick={onClose}>
            ×
          </Close>
        </Head>
        <Body>{children}</Body>
        {footer ? <Foot>{footer}</Foot> : null}
      </Panel>
    </Overlay>
  );
};
