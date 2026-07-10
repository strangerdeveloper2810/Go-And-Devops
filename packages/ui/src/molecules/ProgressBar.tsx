import { styled } from '@mui/material/styles';

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' });
const Head = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
});
const Label = styled('span')({ fontSize: 12, fontWeight: 550, color: 'var(--text-mid)' });
const Pct = styled('span')({
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  color: 'var(--text-lo)',
});
const Track = styled('div')({
  height: 8,
  borderRadius: 'var(--r-pill)',
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
});
const Fill = styled('div', { shouldForwardProp: (p) => p !== 'pct' })<{ pct: number }>(
  ({ pct }) => ({
    height: '100%',
    width: `${pct}%`,
    background: 'var(--accent)',
    borderRadius: 'var(--r-pill)',
    transition: 'width var(--dur) var(--ease)',
  }),
);

// Thanh tiến độ + nhãn % — value 0–100 (tự kẹp biên).
export const ProgressBar = ({ value, label }: { value: number; label?: string }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Wrap>
      <Head>
        <Label>{label ?? ''}</Label>
        <Pct>{pct}%</Pct>
      </Head>
      <Track>
        <Fill
          pct={pct}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </Track>
    </Wrap>
  );
};
