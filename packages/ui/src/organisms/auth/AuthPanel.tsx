import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Surface } from '../../atoms/Surface';
import { Text } from '../../atoms/Text';

// Props thuần trình bày: tiêu đề + phụ đề + chỗ cắm form (children) + footer.
// KHÔNG chứa input/state/logic — chỉ là khung bố cục panel auth.
type AuthPanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

// Hiệu ứng nổi lên nhẹ khi panel xuất hiện.
const fadeUp = keyframes({
  from: { opacity: 0, transform: 'translateY(10px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

// Panel bọc ngoài: dùng Surface (card), giới hạn bề ngang 380, padding 28.
const Panel = styled(Surface)({
  width: '100%',
  maxWidth: 380,
  padding: 28,
  animation: `${fadeUp} 0.5s var(--ease) both`,
});

// Hàng thương hiệu: ô vuông lime + tên sản phẩm.
const Brand = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 4,
});

// Ô vuông lime bo góc chứa dấu '◆'.
const Diamond = styled('span')({
  width: 30,
  height: 30,
  borderRadius: 'var(--r-md)',
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  boxShadow: '0 0 30px var(--accent-dim)',
});

// Tên sản phẩm cạnh ô lime.
const BrandName = styled('span')({
  fontFamily: 'var(--font-sans)',
  fontWeight: 700,
  fontSize: 15,
  color: 'var(--text-hi)',
});

// Tiêu đề chính (dùng atom Text, render như <h1>).
const Title = styled(Text)({
  display: 'block',
  margin: '18px 0 4px',
  letterSpacing: '-0.02em',
});

// Phụ đề mờ dưới tiêu đề.
const Subtitle = styled(Text)({
  display: 'block',
  margin: '0 0 22px',
});

// Footer: căn giữa, chữ mờ — thường là link/ghi chú phụ trợ.
const Foot = styled('div')({
  marginTop: 18,
  fontSize: 12.5,
  color: 'var(--text-lo)',
  textAlign: 'center',
});

// Khung trình bày cho màn đăng nhập/đăng ký: thương hiệu → tiêu đề → phụ đề →
// children (chỗ cắm form) → footer. Presentational thuần: props vào, UI ra.
export const AuthPanel = ({ title, subtitle, children, footer }: AuthPanelProps) => (
  <Panel>
    <Brand>
      <Diamond>◆</Diamond>
      <BrandName>pm platform</BrandName>
    </Brand>
    <Title as="h1" variant="h2">
      {title}
    </Title>
    {subtitle ? (
      <Subtitle as="p" variant="muted">
        {subtitle}
      </Subtitle>
    ) : null}
    {children}
    {footer ? <Foot>{footer}</Foot> : null}
  </Panel>
);
