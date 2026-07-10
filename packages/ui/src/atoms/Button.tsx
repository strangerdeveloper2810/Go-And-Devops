import { styled } from '@mui/material/styles';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

// Padding theo size — bản thường vs bản iconOnly (vuông).
const pad: Record<Size, string> = {
  xs: '4px 8px',
  sm: '6px 10px',
  md: '9px 15px',
  lg: '12px 20px',
};
const iconPad: Record<Size, string> = { xs: '5px', sm: '7px', md: '10px', lg: '13px' };
const fontSizeFor: Record<Size, number> = { xs: 12, sm: 13, md: 14, lg: 15 };

type StyleProps = {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  fullWidth?: boolean;
};

// Nút "console": primary = lime đặc, subtle = surface + hairline, ghost = trong suốt, danger = đỏ mờ.
const StyledButton = styled('button', {
  shouldForwardProp: (p) =>
    p !== 'variant' && p !== 'size' && p !== 'iconOnly' && p !== 'fullWidth',
})<StyleProps>(({ variant = 'subtle', size = 'md', iconOnly = false, fullWidth = false }) => ({
  display: fullWidth ? 'flex' : 'inline-flex',
  width: fullWidth ? '100%' : 'auto',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: 'var(--font-sans)',
  fontWeight: 550,
  fontSize: fontSizeFor[size],
  lineHeight: 1,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  padding: iconOnly ? iconPad[size] : pad[size],
  borderRadius: 'var(--r-md)',
  border: '1px solid transparent',
  transition:
    'background var(--dur) var(--ease), border-color var(--dur) var(--ease), transform var(--dur) var(--ease), filter var(--dur) var(--ease)',
  ...(variant === 'primary' && {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
    '&:active': { transform: 'translateY(0)' },
  }),
  ...(variant === 'subtle' && {
    background: 'var(--surface-2)',
    color: 'var(--text-hi)',
    borderColor: 'var(--border)',
    '&:hover': { background: 'var(--surface-3)', borderColor: 'var(--border-strong)' },
  }),
  ...(variant === 'ghost' && {
    background: 'transparent',
    color: 'var(--text-mid)',
    '&:hover': { background: 'var(--surface-3)', color: 'var(--text-hi)' },
  }),
  ...(variant === 'danger' && {
    background: 'color-mix(in srgb, var(--red) 14%, transparent)',
    color: 'var(--red)',
    borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)',
    '&:hover': { background: 'color-mix(in srgb, var(--red) 22%, transparent)' },
  }),
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed', transform: 'none', filter: 'none' },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-dim)',
  },
}));

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { loading?: boolean };

// Wrapper thêm loading (Spinner + tự disable) giữ nguyên API cũ (variant/size/onClick/type...).
export const Button = ({ loading = false, disabled, children, ...rest }: ButtonProps) => (
  <StyledButton disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
    {loading ? <Spinner size={14} /> : null}
    {children}
  </StyledButton>
);
