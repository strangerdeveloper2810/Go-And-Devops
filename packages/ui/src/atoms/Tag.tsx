import { styled } from '@mui/material/styles';

export type Tone = 'neutral' | 'red' | 'amber' | 'blue' | 'green' | 'violet' | 'accent';

const toneVar: Record<Tone, string> = {
  neutral: 'var(--text-mid)',
  red: 'var(--red)',
  amber: 'var(--amber)',
  blue: 'var(--blue)',
  green: 'var(--green)',
  violet: 'var(--violet)',
  accent: 'var(--accent)',
};

type TagProps = { tone?: Tone; size?: 'sm' | 'md'; solid?: boolean };

// Pill trạng thái / nhãn / priority. soft (mặc định) = nền color-mix mờ; solid = nền đặc màu tone, chữ tối.
export const Tag = styled('span', {
  shouldForwardProp: (p) => p !== 'tone' && p !== 'size' && p !== 'solid',
})<TagProps>(({ tone = 'neutral', size = 'md', solid = false }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-sans)',
  fontSize: size === 'sm' ? 11 : 12,
  fontWeight: 550,
  lineHeight: 1,
  padding: size === 'sm' ? '3px 7px' : '4px 9px',
  borderRadius: 'var(--r-pill)',
  ...(solid
    ? {
        color: tone === 'accent' ? 'var(--accent-contrast)' : '#0E0E11',
        background: toneVar[tone],
        border: `1px solid ${toneVar[tone]}`,
      }
    : {
        color: toneVar[tone],
        background: `color-mix(in srgb, ${toneVar[tone]} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${toneVar[tone]} 26%, transparent)`,
      }),
}));
