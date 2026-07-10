import { styled } from '@mui/material/styles';

type SwitchProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

// Track của switch — bật thì nền accent, tắt thì surface-3. box-border để canh thumb chuẩn.
const Track = styled('button', { shouldForwardProp: (p) => p !== 'on' })<{ on: boolean }>(
  ({ on }) => ({
    position: 'relative',
    boxSizing: 'border-box',
    width: 40,
    height: 22,
    flexShrink: 0,
    padding: 0,
    border: '1px solid',
    borderColor: on ? 'var(--accent)' : 'var(--border-strong)',
    borderRadius: 'var(--r-pill)',
    background: on ? 'var(--accent)' : 'var(--surface-3)',
    cursor: 'pointer',
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
    '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-dim)',
    },
  }),
);

// Thumb tròn — trượt sang phải 18px khi bật.
const Thumb = styled('span', { shouldForwardProp: (p) => p !== 'on' })<{ on: boolean }>(
  ({ on }) => ({
    position: 'absolute',
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: on ? 'var(--accent-contrast)' : 'var(--text-lo)',
    transform: on ? 'translateX(18px)' : 'translateX(0)',
    transition: 'transform var(--dur) var(--ease), background var(--dur) var(--ease)',
  }),
);

// Toggle bật/tắt — controlled qua checked/onChange, role="switch" cho a11y.
export const Switch = ({ checked = false, onChange, disabled }: SwitchProps) => (
  <Track
    type="button"
    role="switch"
    aria-checked={checked}
    on={checked}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
  >
    <Thumb on={checked} />
  </Track>
);
