import { styled } from '@mui/material/styles';

type Tab = { key: string; label: string };

const Row = styled('div')({ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' });
const TabBtn = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    position: 'relative',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 13.5,
    fontWeight: 550,
    padding: '9px 12px',
    color: active ? 'var(--text-hi)' : 'var(--text-mid)',
    transition: 'color var(--dur) var(--ease)',
    '&:hover': { color: 'var(--text-hi)' },
    // Gạch chân accent cho tab active (ngồi đè lên border-bottom của Row).
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: -1,
      height: 2,
      borderRadius: 2,
      background: active ? 'var(--accent)' : 'transparent',
    },
  }),
);

// Hàng tab điều hướng — tab active gạch chân accent (state do container giữ).
export const Tabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab[];
  value: string;
  onChange?: (key: string) => void;
}) => (
  <Row role="tablist">
    {tabs.map((t) => (
      <TabBtn
        key={t.key}
        type="button"
        role="tab"
        aria-selected={t.key === value}
        active={t.key === value}
        onClick={() => onChange?.(t.key)}
      >
        {t.label}
      </TabBtn>
    ))}
  </Row>
);
