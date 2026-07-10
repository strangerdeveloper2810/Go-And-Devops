import { styled } from '@mui/material/styles';
import { Icon } from './Icon';

type Option = { value: string; label: string };
type SelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  disabled?: boolean;
};

const Wrap = styled('div')({ position: 'relative', display: 'inline-flex', width: '100%' });

// Select native được style khớp TextField (appearance none để tự vẽ chevron).
const NativeSelect = styled('select')({
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-hi)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  padding: '10px 34px 10px 12px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
  '&:hover': { borderColor: 'var(--border-strong)' },
  '&:focus': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' },
  '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
});

// Chevron tự vẽ (native arrow bị appearance:none ẩn), không nhận sự kiện chuột.
const Chevron = styled('span')({
  position: 'absolute',
  right: 11,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: 'var(--text-lo)',
  display: 'inline-flex',
});

// Dropdown native styled — value/onChange controlled, options {value,label}[].
export const Select = ({ value, onChange, options, disabled }: SelectProps) => (
  <Wrap>
    <NativeSelect value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
    <Chevron>
      <Icon name="chevron" size={16} />
    </Chevron>
  </Wrap>
);
