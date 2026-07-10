import { styled } from '@mui/material/styles';

const Box = styled('div')({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
});
const Value = styled('span')({
  fontSize: 18,
  fontWeight: 650,
  color: 'var(--text-hi)',
  fontFamily: 'var(--font-mono)',
});
const Label = styled('span')({ fontSize: 12, color: 'var(--text-mid)' });

// Chỉ số nhỏ: giá trị + nhãn (vd "12 issues", "68% done").
export const StatPill = ({ value, label }: { value: string | number; label: string }) => (
  <Box>
    <Value>{value}</Value>
    <Label>{label}</Label>
  </Box>
);
