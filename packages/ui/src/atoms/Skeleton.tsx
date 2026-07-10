import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';

// Gradient chạy ngang tạo hiệu ứng shimmer khi loading.
const shimmer = keyframes({
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
});

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
};

// Khối placeholder loading — width/height/radius tuỳ chỉnh, tự shimmer vô tận.
export const Skeleton = styled('span', {
  shouldForwardProp: (p) => p !== 'width' && p !== 'height' && p !== 'radius',
})<SkeletonProps>(({ width = '100%', height = 14, radius = 'var(--r-sm)' }) => ({
  display: 'block',
  width,
  height,
  borderRadius: radius,
  background:
    'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 37%, var(--surface-2) 63%)',
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.4s ease-in-out infinite`,
}));
