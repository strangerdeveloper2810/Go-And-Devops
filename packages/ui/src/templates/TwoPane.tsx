import { styled } from '@mui/material/styles';
// Bố cục 2 cột: sidebar cố định + nội dung co giãn (vd Pages: cây trái + viewer phải).
export const TwoPane = styled('div', { shouldForwardProp: (p) => p !== 'asideWidth' })<{
  asideWidth?: number;
}>(({ asideWidth = 260 }) => ({
  display: 'grid',
  gridTemplateColumns: `${asideWidth}px 1fr`,
  gap: 16,
  alignItems: 'start',
}));
