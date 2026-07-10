import { styled } from '@mui/material/styles';
import type { Tone } from './Tag';

// Bảng màu theo tone — mặc định fill accent.
const toneVar: Record<Tone, string> = {
  neutral: 'var(--text-mid)',
  red: 'var(--red)',
  amber: 'var(--amber)',
  blue: 'var(--blue)',
  green: 'var(--green)',
  violet: 'var(--violet)',
  accent: 'var(--accent)',
};

// Track nền surface-3, bo pill, cắt phần fill tràn.
const Track = styled('div')({
  width: '100%',
  height: 8,
  borderRadius: 'var(--r-pill)',
  background: 'var(--surface-3)',
  overflow: 'hidden',
});

// Fill màu theo tone, rộng theo % — animate khi value đổi.
const Fill = styled('div', { shouldForwardProp: (p) => p !== 'pct' && p !== 'tone' })<{
  pct: number;
  tone: Tone;
}>(({ pct, tone }) => ({
  width: `${pct}%`,
  height: '100%',
  borderRadius: 'var(--r-pill)',
  background: toneVar[tone],
  transition: 'width var(--dur) var(--ease)',
}));

// Thanh tiến trình — value 0-100 (clamp an toàn), tone tuỳ chọn.
export const Progress = ({ value, tone = 'accent' }: { value: number; tone?: Tone }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <Track role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <Fill pct={pct} tone={tone} />
    </Track>
  );
};
