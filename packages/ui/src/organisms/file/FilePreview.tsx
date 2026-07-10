import { styled } from '@mui/material/styles';
import { Icon } from '../../atoms/Icon';
import type { IconName } from '../../atoms/Icon';
import { Surface } from '../../atoms/Surface';
import { formatSize } from './FileCard';

export type FilePreviewProps = {
  name: string;
  mime: string;
  size: number;
};

// Nhận diện file ảnh để chọn khung xem trước riêng.
const isImage = (mime: string): boolean => (mime || '').toLowerCase().startsWith('image/');

// Với file không phải ảnh: chọn icon lớn + màu theo nhóm mime.
const bigIconFor = (mime: string): { icon: IconName; color: string } => {
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf') || m.includes('word') || m.includes('document') || m.startsWith('text/'))
    return { icon: 'doc', color: 'var(--red)' };
  return { icon: 'file', color: 'var(--blue)' };
};

const Inner = styled('div')({ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 });

// Khung placeholder cho ảnh: ô 16:10 nền chìm + icon palette mờ giữa (chưa load ảnh thật).
const Frame = styled('div')({
  aspectRatio: '16 / 10',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-3)',
  border: '1px dashed var(--border-strong)',
  color: 'var(--text-lo)',
});
const FrameHint = styled('div')({ fontSize: 12, color: 'var(--text-lo)' });

// Icon lớn tô màu cho file không phải ảnh.
const BigIcon = styled('div', { shouldForwardProp: (p) => p !== 'color' })<{ color: string }>(
  ({ color }) => ({
    aspectRatio: '16 / 10',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--r-md)',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
  }),
);

// Tên file: ellipsis 1 dòng.
const Name = styled('div')({
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-hi)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
const Sub = styled('div')({ fontSize: 12.5, color: 'var(--text-lo)' });

// Ô xem trước 1 file: ảnh → khung placeholder 16:10; khác → icon lớn theo nhóm. Kèm tên + size.
export const FilePreview = ({ name, mime, size }: FilePreviewProps) => {
  const image = isImage(mime);
  const big = bigIconFor(mime);
  return (
    <Surface>
      <Inner>
        {image ? (
          <Frame>
            <Icon name="palette" size={34} />
            <FrameHint>Xem trước ảnh</FrameHint>
          </Frame>
        ) : (
          <BigIcon color={big.color}>
            <Icon name={big.icon} size={40} />
          </BigIcon>
        )}
        <div>
          <Name title={name}>{name}</Name>
          <Sub>{formatSize(size)}</Sub>
        </div>
      </Inner>
    </Surface>
  );
};
