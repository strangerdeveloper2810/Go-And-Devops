import { styled } from '@mui/material/styles';

// Props presentational cho thanh chuyển trạng thái workflow của 1 issue.
export interface WorkflowBarProps {
  statuses: string[];
  current: string;
  onSelect?: (status: string) => void;
}

// Bao ngoài kiểu "segmented" — nền inset + bo tròn pill.
const Bar = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: 4,
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-pill)',
});

// Mỗi bước = 1 status; cái current tô accent nổi bật, còn lại mờ + hover.
const Step = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    appearance: 'none',
    fontFamily: 'var(--font-sans)',
    fontSize: 12.5,
    fontWeight: 550,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    padding: '7px 13px',
    borderRadius: 'var(--r-pill)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition:
      'background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease)',
    ...(active
      ? { background: 'var(--accent)', color: 'var(--accent-contrast)' }
      : {
          background: 'transparent',
          color: 'var(--text-mid)',
          '&:hover': { background: 'var(--surface-3)', color: 'var(--text-hi)' },
        }),
    '&:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-dim)',
    },
  }),
);

export const WorkflowBar = ({ statuses, current, onSelect }: WorkflowBarProps) => (
  <Bar role="group" aria-label="Workflow status">
    {statuses.map((s) => (
      <Step
        key={s}
        active={s === current}
        aria-pressed={s === current}
        onClick={() => onSelect?.(s)}
      >
        {s}
      </Step>
    ))}
  </Bar>
);
