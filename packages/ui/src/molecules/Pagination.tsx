import { styled } from '@mui/material/styles';

const Row = styled('div')({ display: 'inline-flex', alignItems: 'center', gap: 4 });
const Btn = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    minWidth: 32,
    height: 32,
    padding: '0 8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    borderRadius: 'var(--r-md)',
    cursor: 'pointer',
    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? 'var(--accent-contrast)' : 'var(--text-mid)',
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
    '&:hover:not(:disabled)': {
      borderColor: 'var(--border-strong)',
      color: active ? 'var(--accent-contrast)' : 'var(--text-hi)',
    },
    '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
  }),
);
const Ellipsis = styled('span')({
  padding: '0 4px',
  color: 'var(--text-lo)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
});

// Tính dải trang hiển thị quanh trang hiện tại (chèn '…' khi nhiều trang).
const buildRange = (page: number, count: number): (number | '…')[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push('…');
  out.push(count);
  return out;
};

// Điều hướng phân trang — nút prev/next + số trang, trang active nền accent.
export const Pagination = ({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange?: (page: number) => void;
}) => (
  <Row role="navigation" aria-label="Phân trang">
    <Btn
      type="button"
      disabled={page <= 1}
      aria-label="Trang trước"
      onClick={() => onChange?.(page - 1)}
    >
      ‹
    </Btn>
    {buildRange(page, pageCount).map((p, i) =>
      p === '…' ? (
        <Ellipsis key={`e${i}`}>…</Ellipsis>
      ) : (
        <Btn
          key={p}
          type="button"
          active={p === page}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange?.(p)}
        >
          {p}
        </Btn>
      ),
    )}
    <Btn
      type="button"
      disabled={page >= pageCount}
      aria-label="Trang sau"
      onClick={() => onChange?.(page + 1)}
    >
      ›
    </Btn>
  </Row>
);
