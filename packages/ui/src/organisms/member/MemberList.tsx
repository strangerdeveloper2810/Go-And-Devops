import { Fragment } from 'react';
import { Divider } from '../../atoms/Divider';
import { Surface } from '../../atoms/Surface';
import { MemberRow } from './MemberRow';

// Dữ liệu 1 thành viên cho danh sách (id để callback remove định danh).
export type MemberData = {
  id: string | number;
  name: string;
  email?: string;
  role: string;
  joinedLabel?: string;
};

type MemberListProps = {
  members: MemberData[];
  onRemove?: (id: string | number) => void;
};

// Danh sách thành viên: Surface bọc, mỗi dòng 1 MemberRow, Divider xen giữa.
export const MemberList = ({ members, onRemove }: MemberListProps) => (
  <Surface>
    {members.map((m, i) => (
      <Fragment key={m.id}>
        {i > 0 ? <Divider /> : null}
        <MemberRow
          name={m.name}
          email={m.email}
          role={m.role}
          joinedLabel={m.joinedLabel}
          onRemove={onRemove ? () => onRemove(m.id) : undefined}
        />
      </Fragment>
    ))}
  </Surface>
);
