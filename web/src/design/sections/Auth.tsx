import { styled } from '@mui/material/styles';
import { AuthLayout, AuthPanel, Button, Icon, TextField } from '@pm-platform/ui';
import type { FormEvent } from 'react';
import { Code, Doc, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

/**
 * Auth module — khung trình bày cho màn đăng nhập/đăng ký.
 * AuthLayout = nền canh giữa; AuthPanel = card chứa thương hiệu + tiêu đề + slot form.
 * Cả hai đều PRESENTATIONAL thuần: không giữ state, không logic — form cắm qua children.
 */

// Frame thu gọn để xem AuthLayout (component thật minHeight 100vh) trong trang doc.
// Ghi đè chiều cao của <Screen> (con trực tiếp) về 100% khung 460px để panel canh giữa.
const AuthFrame = styled('div')({
  height: 460,
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  background: 'var(--bg)',
  '& > div': { minHeight: '100% !important' },
});

// Nút giả lập slot topRight (đổi theme) — chỉ để minh hoạ, không gắn logic.
const IconBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text-mid)',
  cursor: 'pointer',
});

// Form giả (preventDefault) — chỉ để render input/nút trong specimen.
const stop = (e: FormEvent) => e.preventDefault();

export default function AuthSection() {
  return (
    <div>
      <SectionTitle>Auth module</SectionTitle>
      <SectionLead>
        Bộ khung cho luồng xác thực. Component tách bạch trình bày khỏi logic: bạn tự quản state
        form (React Hook Form / TanStack Query) rồi cắm input + nút vào <Code>children</Code> của{' '}
        <Code>AuthPanel</Code>. Identity thật do api-gateway cấp — UI chỉ lo bố cục & thẩm mỹ.
      </SectionLead>

      {/* AUTH PANEL */}
      <Doc
        name="AuthPanel"
        tagline="Card đăng nhập/đăng ký: hàng thương hiệu (◆ pm platform) → tiêu đề → phụ đề → slot form (children) → footer. maxWidth 380, hiệu ứng fade-up khi xuất hiện."
      >
        <GroupLabel>Biến thể · Đăng nhập</GroupLabel>
        <Specimen center>
          <AuthPanel
            title="Đăng nhập"
            subtitle="Chào mừng trở lại PM Platform"
            footer={
              <>
                Chưa có tài khoản?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Đăng ký</span>
              </>
            }
          >
            <form onSubmit={stop} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextField label="Email" type="email" placeholder="you@company.com" />
              <TextField label="Mật khẩu" type="password" placeholder="••••••••" />
              <Button variant="primary" style={{ width: '100%' }}>
                Đăng nhập
              </Button>
            </form>
          </AuthPanel>
        </Specimen>

        <GroupLabel>Biến thể · Đăng ký</GroupLabel>
        <Specimen center>
          <AuthPanel
            title="Tạo tài khoản"
            subtitle="Bắt đầu với không gian làm việc đầu tiên của bạn"
            footer={
              <>
                Đã có tài khoản?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Đăng nhập</span>
              </>
            }
          >
            <form onSubmit={stop} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextField label="Họ tên" type="text" placeholder="Nguyễn Văn A" />
              <TextField label="Email" type="email" placeholder="you@company.com" />
              <TextField label="Mật khẩu" type="password" placeholder="Tối thiểu 8 ký tự" />
              <Button variant="primary" style={{ width: '100%' }}>
                Đăng ký
              </Button>
            </form>
          </AuthPanel>
        </Specimen>

        <PropsTable
          rows={[
            { name: 'title', type: 'string', desc: 'Tiêu đề chính, render như <h1> (variant h2).' },
            {
              name: 'subtitle',
              type: 'string',
              desc: 'Phụ đề mờ dưới tiêu đề. Bỏ qua nếu không truyền.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Chỗ cắm form (TextField + Button). Panel không chứa input/state.',
            },
            {
              name: 'footer',
              type: 'ReactNode',
              desc: 'Ghi chú/link căn giữa dưới cùng (vd chuyển đăng ký ↔ đăng nhập).',
            },
          ]}
        />
      </Doc>

      {/* AUTH LAYOUT */}
      <Doc
        name="AuthLayout"
        tagline="Nền full-height canh giữa nội dung (thường là AuthPanel), kèm slot cố định góc trên-phải cho nút phụ như đổi theme. Dưới đây là bản thu gọn chiều cao để xem trong doc."
      >
        <AuthFrame>
          <AuthLayout
            topRight={
              <IconBtn aria-label="Đổi theme">
                <Icon name="sun" size={18} />
              </IconBtn>
            }
          >
            <AuthPanel title="Đăng nhập" subtitle="AuthPanel nằm giữa AuthLayout">
              <form onSubmit={stop} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TextField label="Email" type="email" placeholder="you@company.com" />
                <TextField label="Mật khẩu" type="password" placeholder="••••••••" />
                <Button variant="primary" style={{ width: '100%' }}>
                  Đăng nhập
                </Button>
              </form>
            </AuthPanel>
          </AuthLayout>
        </AuthFrame>

        <PropsTable
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Nội dung được canh giữa màn hình (thường là một AuthPanel).',
            },
            {
              name: 'topRight',
              type: 'ReactNode',
              desc: 'Slot cố định góc trên-phải — vd nút đổi theme (sun/moon).',
            },
          ]}
        />
      </Doc>
    </div>
  );
}
