import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

// Map tone → biến màu + glyph chỉ báo (icon dạng ký tự trong badge tròn).
const toneColor: Record<Tone, string> = {
  info: 'var(--blue)',
  success: 'var(--green)',
  warning: 'var(--amber)',
  danger: 'var(--red)',
};
const toneGlyph: Record<Tone, string> = { info: 'i', success: '✓', warning: '!', danger: '✕' };

const Box = styled('div', { shouldForwardProp: (p) => p !== 'tone' })<{ tone: Tone }>(
  ({ tone }) => ({
    display: 'flex',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 'var(--r-md)',
    background: `color-mix(in srgb, ${toneColor[tone]} 10%, var(--surface-1))`,
    border: `1px solid color-mix(in srgb, ${toneColor[tone]} 32%, transparent)`,
  }),
);
const Dot = styled('span', { shouldForwardProp: (p) => p !== 'tone' })<{ tone: Tone }>(
  ({ tone }) => ({
    flexShrink: 0,
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent-contrast)',
    background: toneColor[tone],
  }),
);
const Body = styled('div')({ flex: 1, minWidth: 0 });
const Title = styled('div')({ fontSize: 13.5, fontWeight: 600, color: 'var(--text-hi)' });
const Desc = styled('div')({
  marginTop: 3,
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--text-mid)',
});
const Close = styled('button')({
  flexShrink: 0,
  alignSelf: 'flex-start',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-lo)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: 2,
  borderRadius: 'var(--r-sm)',
  '&:hover': { color: 'var(--text-hi)', background: 'var(--surface-3)' },
});

// Thông báo inline theo ngữ cảnh — glyph + màu suy từ tone; onClose tuỳ chọn.
export const Alert = ({
  tone = 'info',
  title,
  children,
  onClose,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  onClose?: () => void;
}) => (
  <Box tone={tone} role="alert">
    <Dot tone={tone}>{toneGlyph[tone]}</Dot>
    <Body>
      <Title>{title}</Title>
      {children ? <Desc>{children}</Desc> : null}
    </Body>
    {onClose ? (
      <Close type="button" aria-label="Đóng" onClick={onClose}>
        ×
      </Close>
    ) : null}
  </Box>
);
