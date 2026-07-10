import { styled } from '@mui/material/styles';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneColor: Record<Tone, string> = {
  info: 'var(--blue)',
  success: 'var(--green)',
  warning: 'var(--amber)',
  danger: 'var(--red)',
};

const Box = styled('div', { shouldForwardProp: (p) => p !== 'tone' })<{ tone: Tone }>(
  ({ tone }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 240,
    maxWidth: 380,
    padding: '11px 12px 11px 14px',
    background: 'var(--surface-3)',
    border: '1px solid var(--border-strong)',
    borderLeft: `3px solid ${toneColor[tone]}`,
    borderRadius: 'var(--r-md)',
    boxShadow: '0 12px 32px -14px rgba(0, 0, 0, 0.55)',
  }),
);
const Msg = styled('span')({ flex: 1, fontSize: 13, lineHeight: 1.4, color: 'var(--text-hi)' });
const Close = styled('button')({
  flexShrink: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-lo)',
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
  padding: 2,
  borderRadius: 'var(--r-sm)',
  '&:hover': { color: 'var(--text-hi)', background: 'var(--surface-2)' },
});

// Item thông báo nổi (toast) — stripe trái theo tone; onClose tuỳ chọn.
export const Toast = ({
  tone = 'info',
  message,
  onClose,
}: {
  tone?: Tone;
  message: string;
  onClose?: () => void;
}) => (
  <Box tone={tone} role="status">
    <Msg>{message}</Msg>
    {onClose ? (
      <Close type="button" aria-label="Đóng" onClick={onClose}>
        ×
      </Close>
    ) : null}
  </Box>
);
