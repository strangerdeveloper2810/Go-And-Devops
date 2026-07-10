import { styled } from '@mui/material/styles';
import { type FormEvent, useState } from 'react';
import { Button } from '../../atoms/Button';
import { TextField } from '../../atoms/TextField';

export type InviteFormProps = {
  onInvite?: (email: string, role: string) => void;
};

// Các vai trò có thể mời — khớp domain workspace (owner/admin/member).
const ROLES = ['member', 'admin', 'owner'] as const;

// Form dàn ngang, dồn xuống dòng khi hẹp. Nút "Mời" tự căn đáy nhờ align-items flex-end.
const Form = styled('form')({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: 10,
});
// Ô email chiếm phần co giãn (TextField atom vốn rộng 100%).
const EmailWrap = styled('div')({ flex: 1, minWidth: 200 });

// Cụm label + Select cho vai trò (không có atom Select nên tự dựng, style đồng bộ TextField).
const RoleField = styled('label')({ display: 'flex', flexDirection: 'column', gap: 6 });
const LabelText = styled('span')({ fontSize: 12, fontWeight: 550, color: 'var(--text-mid)' });
const Select = styled('select')({
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-hi)',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  padding: '10px 12px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
  '&:hover': { borderColor: 'var(--border-strong)' },
  '&:focus': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' },
});

// Form mời thành viên: TextField email + Select role + nút "Mời". Presentational — state input nội
// bộ, chỉ bắn callback onInvite(email, role) rồi reset email (không tự gọi API). Bỏ qua email rỗng.
export const InviteForm = ({ onInvite }: InviteFormProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return; // bỏ qua email rỗng
    onInvite?.(value, role);
    setEmail('');
  };

  return (
    <Form onSubmit={submit}>
      <EmailWrap>
        <TextField
          label="Email"
          type="email"
          placeholder="ten@congty.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </EmailWrap>
      <RoleField>
        <LabelText>Vai trò</LabelText>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </RoleField>
      <Button type="submit" variant="primary" size="md">
        Mời
      </Button>
    </Form>
  );
};
