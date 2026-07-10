import { styled } from '@mui/material/styles';

export type PermissionRowProps = {
  label: string;
  description?: string;
  allowed: boolean;
  onToggle?: () => void;
};

const Row = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '10px 14px',
});
const Text = styled('div')({
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});
const Label = styled('div')({ fontSize: 13.5, fontWeight: 550, color: 'var(--text-hi)' });
const Desc = styled('div')({ fontSize: 12.5, color: 'var(--text-lo)', lineHeight: 1.45 });

// Switch bật/tắt — không có atom Switch nên tự dựng bằng button (role switch, a11y aria-checked).
// Bật: nền accent; tắt: nền surface-3. Núm trượt sang phải khi bật.
const Track = styled('button', { shouldForwardProp: (p) => p !== 'on' })<{ on: boolean }>(
  ({ on }) => ({
    flexShrink: 0,
    position: 'relative',
    width: 38,
    height: 22,
    padding: 0,
    borderRadius: 'var(--r-pill)',
    border: '1px solid',
    borderColor: on ? 'var(--accent)' : 'var(--border-strong)',
    background: on ? 'var(--accent)' : 'var(--surface-3)',
    cursor: 'pointer',
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
    '&:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-dim)',
    },
  }),
);
const Knob = styled('span', { shouldForwardProp: (p) => p !== 'on' })<{ on: boolean }>(
  ({ on }) => ({
    position: 'absolute',
    top: 2,
    left: on ? 18 : 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: on ? 'var(--accent-contrast)' : 'var(--text-lo)',
    transition: 'left var(--dur) var(--ease), background var(--dur) var(--ease)',
  }),
);

// Dòng phân quyền: nhãn + mô tả (trái) · switch bật/tắt (phải). Presentational — trạng thái do container giữ.
export const PermissionRow = ({ label, description, allowed, onToggle }: PermissionRowProps) => (
  <Row>
    <Text>
      <Label>{label}</Label>
      {description ? <Desc>{description}</Desc> : null}
    </Text>
    <Track
      type="button"
      role="switch"
      aria-checked={allowed}
      aria-label={label}
      on={allowed}
      onClick={onToggle}
    >
      <Knob on={allowed} />
    </Track>
  </Row>
);
