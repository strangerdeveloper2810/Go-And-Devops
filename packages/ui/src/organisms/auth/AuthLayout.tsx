import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

// Props thuần trình bày: nội dung ở giữa + slot góc trên-phải (vd nút đổi theme).
type AuthLayoutProps = {
  children: ReactNode;
  topRight?: ReactNode;
};

// Nền full-height, canh giữa nội dung. zIndex:1 để nằm trên lớp trang trí nền (nếu có).
const Screen = styled('div')({
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  position: 'relative',
  zIndex: 1,
});

// Slot cố định góc trên-phải — vd nút toggle theme.
const TopRight = styled('div')({
  position: 'absolute',
  top: 20,
  right: 20,
});

// Layout trình bày cho khu vực auth: canh giữa panel, kèm slot topRight tuỳ chọn.
export const AuthLayout = ({ children, topRight }: AuthLayoutProps) => (
  <Screen>
    {topRight ? <TopRight>{topRight}</TopRight> : null}
    {children}
  </Screen>
);
