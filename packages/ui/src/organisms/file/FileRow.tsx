import { styled } from '@mui/material/styles';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import type { IconName } from '../../atoms/Icon';
import { formatSize } from './FileCard';

export type FileRowProps = {
  name: string;
  mime: string;
  size: number;
  createdLabel?: string;
  onDownload?: () => void;
  onDelete?: () => void;
};

// Phân nhóm mime → icon + màu badge (giống FileCard nhưng nội bộ FileRow để tự chứa):
// ảnh (violet), tài liệu/pdf/text (red), còn lại (blue).
const badgeFor = (mime: string): { icon: IconName; color: string } => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return { icon: 'palette', color: 'var(--violet)' };
  if (m.includes('pdf') || m.includes('word') || m.includes('document') || m.startsWith('text/'))
    return { icon: 'doc', color: 'var(--red)' };
  return { icon: 'file', color: 'var(--blue)' };
};

// Dòng file trong list-view — cao thấp, dàn ngang: badge · tên · size · date · actions.
const Row = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
});

// Ô icon vuông nhỏ tô màu theo nhóm mime (compact hơn card).
const IconBox = styled('div', { shouldForwardProp: (p) => p !== 'color' })<{ color: string }>(
  ({ color }) => ({
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 'var(--r-sm)',
    color,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  }),
);

// Tên file: chiếm phần co giãn, cắt ellipsis 1 dòng.
const Name = styled('div')({
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  fontWeight: 550,
  color: 'var(--text-hi)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
// Cột meta cố định bên phải (size, ngày) — dùng mono cho thẳng cột.
const Size = styled('div')({
  flexShrink: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text-mid)',
  minWidth: 62,
  textAlign: 'right',
});
const DateCol = styled('div')({
  flexShrink: 0,
  fontSize: 12,
  color: 'var(--text-lo)',
});
const Actions = styled('div')({ flexShrink: 0, display: 'flex', gap: 6 });

// Dòng file compact cho list-view: icon theo mime + tên (ellipsis) + size + ngày + 2 action.
export const FileRow = ({ name, mime, size, createdLabel, onDownload, onDelete }: FileRowProps) => {
  const badge = badgeFor(mime);
  return (
    <Row>
      <IconBox color={badge.color}>
        <Icon name={badge.icon} size={15} />
      </IconBox>
      <Name title={name}>{name}</Name>
      <Size>{formatSize(size)}</Size>
      {createdLabel ? <DateCol>{createdLabel}</DateCol> : null}
      <Actions>
        {onDownload ? (
          <Button variant="ghost" size="sm" onClick={onDownload}>
            Tải
          </Button>
        ) : null}
        {onDelete ? (
          <Button variant="danger" size="sm" onClick={onDelete}>
            Xoá
          </Button>
        ) : null}
      </Actions>
    </Row>
  );
};
