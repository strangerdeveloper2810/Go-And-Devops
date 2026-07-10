import { styled } from '@mui/material/styles';
import { Button } from '../../atoms/Button';
import { Text } from '../../atoms/Text';
import { UserChip } from '../../molecules/UserChip';
import { RoleTag } from './RoleTag';

type MemberRowProps = {
  name: string;
  email?: string;
  role: string;
  joinedLabel?: string;
  onRemove?: () => void;
};

const Row = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
});
// Giữa: role + ngày tham gia; đẩy phần này sát cột phải bằng marginLeft auto.
const Mid = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' });

// 1 dòng thành viên: chip (avatar + tên + email) · role + joined · nút remove.
export const MemberRow = ({ name, email, role, joinedLabel, onRemove }: MemberRowProps) => (
  <Row>
    <UserChip name={name} meta={email} />
    <Mid>
      <RoleTag role={role} />
      {joinedLabel ? <Text variant="muted">{joinedLabel}</Text> : null}
    </Mid>
    {onRemove ? (
      <Button variant="ghost" size="sm" onClick={onRemove}>
        Remove
      </Button>
    ) : null}
  </Row>
);
