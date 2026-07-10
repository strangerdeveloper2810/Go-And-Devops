import { styled } from '@mui/material/styles';
import { Icon } from '../../atoms/Icon';

// Props presentational cho 1 dòng trong cây trang (page tree).
export interface PageTreeItemProps {
  title: string;
  depth?: number; // độ sâu → indent
  active?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void; // bấm chevron (không lan ra onClick)
  onClick?: () => void; // bấm dòng
}

const Row = styled('div', { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(
  ({ active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingRight: 8,
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
    color: active ? 'var(--text-hi)' : 'var(--text-mid)',
    background: active ? 'var(--surface-2)' : 'transparent',
    transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
    '&:hover': { background: 'var(--surface-2)', color: 'var(--text-hi)' },
  }),
);

// Nút chevron: xoay -90deg khi thu gọn, về 0 (chỉ xuống) khi mở.
const Toggle = styled('button', { shouldForwardProp: (p) => p !== 'spin' })<{ spin?: boolean }>(
  ({ spin }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 18,
    height: 18,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-lo)',
    cursor: 'pointer',
    borderRadius: 'var(--r-sm)',
    transform: spin ? 'rotate(0deg)' : 'rotate(-90deg)',
    transition: 'transform var(--dur) var(--ease), color var(--dur) var(--ease)',
    '&:hover': { color: 'var(--text-hi)' },
  }),
);

// Chỗ trống thay chevron để title thẳng hàng khi không có con.
const Spacer = styled('span')({ width: 18, flexShrink: 0 });

const Title = styled('span')({
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const PageTreeItem = ({
  title,
  depth = 0,
  active,
  hasChildren,
  expanded,
  onToggle,
  onClick,
}: PageTreeItemProps) => (
  <Row active={active} onClick={onClick} style={{ paddingLeft: 8 + depth * 16 }}>
    {hasChildren ? (
      <Toggle
        spin={expanded}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
      >
        <Icon name="chevron" size={14} />
      </Toggle>
    ) : (
      <Spacer />
    )}
    <Title>{title}</Title>
  </Row>
);
