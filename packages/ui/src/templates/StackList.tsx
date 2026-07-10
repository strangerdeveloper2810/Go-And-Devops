import { styled } from '@mui/material/styles';

// Xếp chồng dọc: danh sách item cách đều nhau (vd list card, hàng cài đặt, feed).
// `gap` = khoảng cách dọc giữa các item (px). Presentational thuần: là styled <div>.
export const StackList = styled('div', { shouldForwardProp: (p) => p !== 'gap' })<{
  gap?: number;
}>(({ gap = 8 }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
}));
