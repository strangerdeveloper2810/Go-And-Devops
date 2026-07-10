import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

// Lưới auto-fill chứa FileCard — cột min 220px, co giãn đều, gap 12. Caller map FileCard vào children.
const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 12,
});

export const FileGrid = ({ children }: { children?: ReactNode }) => <Grid>{children}</Grid>;
