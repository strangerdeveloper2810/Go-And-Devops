import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type SettingItemProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

// Dòng cài đặt: tiêu đề + mô tả (trái) · control action (phải, tự căn nhờ marginLeft auto).
const Row = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '14px 16px',
});
const Text = styled('div')({
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
});
const Title = styled('div')({ fontSize: 14, fontWeight: 600, color: 'var(--text-hi)' });
const Desc = styled('div')({ fontSize: 12.5, color: 'var(--text-lo)', lineHeight: 1.45 });
const Action = styled('div')({ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 });

// 1 dòng trong trang Settings: nhãn + mô tả bên trái, action (Button/Switch/Tag...) bên phải.
export const SettingItem = ({ title, description, action }: SettingItemProps) => (
  <Row>
    <Text>
      <Title>{title}</Title>
      {description ? <Desc>{description}</Desc> : null}
    </Text>
    {action ? <Action>{action}</Action> : null}
  </Row>
);
