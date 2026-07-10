import { Tag, type Tone } from '../../atoms/Tag';

// Suy tone màu từ role: owner nổi bật (accent), admin (violet), còn lại trung tính.
export const roleTone = (role: string): Tone => {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'accent';
    case 'admin':
      return 'violet';
    case 'member':
      return 'neutral';
    default:
      return 'neutral';
  }
};

// Nhãn vai trò thành viên — pill màu theo role.
export const RoleTag = ({ role }: { role: string }) => <Tag tone={roleTone(role)}>{role}</Tag>;
