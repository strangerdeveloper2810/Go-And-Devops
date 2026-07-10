import { styled } from '@mui/material/styles';

// Props presentational cho nhãn (label) của issue.
export interface LabelChipProps {
  label: string;
  onRemove?: () => void; // có → hiện nút x
}

// Chip nhỏ tone violet (khớp Tag tone="violet") — dùng cho label removable.
const Chip = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 550,
  lineHeight: 1,
  padding: '4px 8px',
  borderRadius: 'var(--r-pill)',
  color: 'var(--violet)',
  background: 'color-mix(in srgb, var(--violet) 13%, transparent)',
  border: '1px solid color-mix(in srgb, var(--violet) 26%, transparent)',
});

// Nút x: mờ, sáng lên khi hover.
const Remove = styled('button')({
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  padding: 0,
  margin: '0 -2px 0 0',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  borderRadius: 'var(--r-sm)',
  opacity: 0.65,
  transition: 'opacity var(--dur) var(--ease)',
  '&:hover': { opacity: 1 },
});

// Dấu x nhỏ (stroke currentColor) — Icon atom chưa có "close".
const Cross = () => (
  <svg
    width={9}
    height={9}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

export const LabelChip = ({ label, onRemove }: LabelChipProps) => (
  <Chip>
    <span>{label}</span>
    {onRemove ? (
      <Remove aria-label={`Remove ${label}`} onClick={onRemove}>
        <Cross />
      </Remove>
    ) : null}
  </Chip>
);
