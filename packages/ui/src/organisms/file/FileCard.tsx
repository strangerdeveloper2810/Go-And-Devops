import { styled } from '@mui/material/styles';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import type { IconName } from '../../atoms/Icon';
import { Surface } from '../../atoms/Surface';

export type FileCardProps = {
  name: string;
  mime: string;
  size: number;
  createdLabel?: string;
  onDownload?: () => void;
  onDelete?: () => void;
};

// bytes → human-readable (B/KB/MB/GB) — dùng cơ số 1024, 1 chữ số thập phân từ KB trở lên.
export const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(1)} ${units[i]}`;
};

// Phân nhóm mime → chọn icon + màu badge: ảnh (violet), pdf/doc (red), còn lại (blue).
const badgeFor = (mime: string): { icon: IconName; color: string } => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return { icon: 'palette', color: 'var(--violet)' };
  if (m.includes('pdf') || m.includes('word') || m.includes('document') || m.startsWith('text/'))
    return { icon: 'doc', color: 'var(--red)' };
  return { icon: 'file', color: 'var(--blue)' };
};

const Inner = styled('div')({ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 });
const Head = styled('div')({ display: 'flex', alignItems: 'flex-start', gap: 10 });

// Ô icon vuông tô màu theo nhóm mime (nền pha loãng màu, chữ đậm màu gốc).
const IconBox = styled('div', { shouldForwardProp: (p) => p !== 'color' })<{ color: string }>(
  ({ color }) => ({
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 'var(--r-md)',
    color,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  }),
);

const Meta = styled('div')({
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});
// Tên file: ellipsis 1 dòng (không tràn card).
const Name = styled('div')({
  fontSize: 13.5,
  fontWeight: 550,
  color: 'var(--text-hi)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
const Sub = styled('div')({
  fontSize: 12,
  color: 'var(--text-lo)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});
const Dot = styled('span')({ color: 'var(--text-lo)' });
const Actions = styled('div')({ display: 'flex', gap: 8 });

// Card hiển thị 1 file: badge icon theo mime, tên (ellipsis), size human + thời điểm tạo, 2 action.
export const FileCard = ({
  name,
  mime,
  size,
  createdLabel,
  onDownload,
  onDelete,
}: FileCardProps) => {
  const badge = badgeFor(mime);
  return (
    <Surface>
      <Inner>
        <Head>
          <IconBox color={badge.color}>
            <Icon name={badge.icon} size={18} />
          </IconBox>
          <Meta>
            <Name title={name}>{name}</Name>
            <Sub>
              <span>{formatSize(size)}</span>
              {createdLabel ? (
                <>
                  <Dot>·</Dot>
                  <span>{createdLabel}</span>
                </>
              ) : null}
            </Sub>
          </Meta>
        </Head>
        <Actions>
          <Button variant="subtle" size="sm" onClick={onDownload}>
            Tải xuống
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Xoá
          </Button>
        </Actions>
      </Inner>
    </Surface>
  );
};
