import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

type CheckboxProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
};

// Bao label + ô — dim khi disabled, con trỏ đổi theo trạng thái.
const Wrap = styled('label', { shouldForwardProp: (p) => p !== 'disabled' })<{
  disabled?: boolean;
}>(({ disabled }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-hi)',
  userSelect: 'none',
}));

// Ô vuông bo nhẹ — checked thì nền accent + tick.
const Box = styled('span', { shouldForwardProp: (p) => p !== 'on' })<{ on: boolean }>(({ on }) => ({
  width: 18,
  height: 18,
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--r-sm)',
  border: '1px solid',
  borderColor: on ? 'var(--accent)' : 'var(--border-strong)',
  background: on ? 'var(--accent)' : 'var(--surface-1)',
  color: 'var(--accent-contrast)',
  transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
}));

// Input native ẩn nhưng vẫn giữ để bàn phím + trợ năng hoạt động.
const HiddenInput = styled('input')({
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
  margin: 0,
});

// Checkbox controlled — tick Icon 'check' khi checked.
export const Checkbox = ({ checked = false, onChange, disabled, label }: CheckboxProps) => (
  <Wrap disabled={disabled}>
    <HiddenInput
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <Box on={checked}>{checked ? <Icon name="check" size={13} /> : null}</Box>
    {label ? <span>{label}</span> : null}
  </Wrap>
);
