import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

// Kit tài liệu hoá design system — dùng chung cho mọi section để trình bày nhất quán.

export const SectionTitle = styled('h2')({
  margin: '0 0 4px',
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-hi)',
});
export const SectionLead = styled('p')({
  margin: '0 0 26px',
  fontSize: 14,
  color: 'var(--text-mid)',
  maxWidth: 700,
  lineHeight: 1.55,
});

// Block tài liệu cho 1 component: tên + mô tả ngắn + nội dung.
const DocBox = styled('section')({
  marginBottom: 40,
  paddingBottom: 36,
  borderBottom: '1px solid var(--border)',
});
const DocName = styled('h3')({
  margin: '0 0 3px',
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--text-hi)',
});
const DocTag = styled('p')({
  margin: '0 0 16px',
  fontSize: 13,
  color: 'var(--text-mid)',
  maxWidth: 660,
  lineHeight: 1.5,
});
export const Doc = ({
  name,
  tagline,
  children,
}: { name: string; tagline?: string; children: ReactNode }) => (
  <DocBox>
    <DocName>{name}</DocName>
    {tagline ? <DocTag>{tagline}</DocTag> : null}
    {children}
  </DocBox>
);

export const GroupLabel = styled('div')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
  margin: '20px 0 10px',
});
export const Row = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
});
export const Grid = styled('div', { shouldForwardProp: (p) => p !== 'min' })<{ min?: number }>(
  ({ min = 150 }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
    gap: 12,
  }),
);

// Khung "specimen" — nền bg + viền để component nổi bật, có nhãn tuỳ chọn.
const SpecLabel = styled('div')({
  fontSize: 12,
  color: 'var(--text-lo)',
  marginBottom: 8,
  fontFamily: 'var(--font-mono)',
});
const SpecBox = styled('div', { shouldForwardProp: (p) => p !== 'center' })<{ center?: boolean }>(
  ({ center }) => ({
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    background: 'var(--bg)',
    padding: 20,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    justifyContent: center ? 'center' : 'flex-start',
  }),
);
export const Specimen = ({
  label,
  center,
  children,
}: { label?: string; center?: boolean; children: ReactNode }) => (
  <div style={{ marginBottom: 12 }}>
    {label ? <SpecLabel>{label}</SpecLabel> : null}
    <SpecBox center={center}>{children}</SpecBox>
  </div>
);

export const Code = styled('code')({
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text-hi)',
  background: 'var(--surface-2)',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid var(--border)',
});

// Bảng props.
const Table = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  marginTop: 14,
});
const Th = styled('th')({
  textAlign: 'left',
  padding: '8px 10px',
  color: 'var(--text-lo)',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-strong)',
});
const Td = styled('td')({
  padding: '9px 10px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-mid)',
  verticalAlign: 'top',
});
export interface PropDef {
  name: string;
  type: string;
  def?: string;
  desc?: string;
}
export const PropsTable = ({ rows }: { rows: PropDef[] }) => (
  <Table>
    <thead>
      <tr>
        <Th>Prop</Th>
        <Th>Type</Th>
        <Th>Default</Th>
        <Th>Mô tả</Th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.name}>
          <Td>
            <Code>{r.name}</Code>
          </Td>
          <Td style={{ color: 'var(--violet)' }}>{r.type}</Td>
          <Td>{r.def ? <Code>{r.def}</Code> : '—'}</Td>
          <Td style={{ color: 'var(--text-mid)' }}>{r.desc ?? ''}</Td>
        </tr>
      ))}
    </tbody>
  </Table>
);

// Foundations helpers.
const SwatchBox = styled('div', { shouldForwardProp: (p) => p !== 'v' })<{ v: string }>(
  ({ v }) => ({
    height: 52,
    borderRadius: 'var(--r-md)',
    background: v,
    border: '1px solid var(--border)',
  }),
);
export const Swatch = ({ name, value }: { name: string; value: string }) => (
  <div>
    <SwatchBox v={value} />
    <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 6 }}>{name}</div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-lo)' }}>
      {value}
    </div>
  </div>
);
export const ScaleItem = ({ label, box }: { label: string; box: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <div
      style={{ width: 90, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-mid)' }}
    >
      {label}
    </div>
    {box}
  </div>
);
