import {
  Divider,
  InviteForm,
  MemberAvatarStack,
  MemberList,
  MemberRow,
  PermissionRow,
  RoleTag,
  Surface,
} from '@pm-platform/ui';
import { useState } from 'react';
import { Doc, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

// Thành viên demo cho danh sách (id để callback remove định danh).
const members = [
  {
    id: 1,
    name: 'Nguyễn Phương Thảo',
    email: 'thao@congty.com',
    role: 'owner',
    joinedLabel: 'Tham gia 2 tháng trước',
  },
  {
    id: 2,
    name: 'Trần Văn Minh',
    email: 'minh@congty.com',
    role: 'admin',
    joinedLabel: '5 tuần trước',
  },
  { id: 3, name: 'Lê Thu Hà', email: 'ha@congty.com', role: 'member', joinedLabel: '2 tuần trước' },
  {
    id: 4,
    name: 'Phạm Quốc Bảo',
    email: 'bao@congty.com',
    role: 'member',
    joinedLabel: '4 ngày trước',
  },
];

const noop = () => {};

// Demo tương tác cho PermissionRow — giữ state cục bộ để bấm switch thấy đổi trạng thái.
const PermissionDemo = () => {
  const [perms, setPerms] = useState({ read: true, write: true, del: false });
  const toggle = (k: keyof typeof perms) => setPerms((p) => ({ ...p, [k]: !p[k] }));
  return (
    <Surface style={{ width: '100%' }}>
      <PermissionRow
        label="Xem nội dung"
        description="Đọc issue, page, file trong workspace."
        allowed={perms.read}
        onToggle={() => toggle('read')}
      />
      <Divider />
      <PermissionRow
        label="Chỉnh sửa"
        description="Tạo/sửa issue và trang tài liệu."
        allowed={perms.write}
        onToggle={() => toggle('write')}
      />
      <Divider />
      <PermissionRow
        label="Xoá & quản trị"
        description="Xoá tài nguyên, mời/gỡ thành viên."
        allowed={perms.del}
        onToggle={() => toggle('del')}
      />
    </Surface>
  );
};

// Module Member tài liệu hoá: role tag + row/list + form mời + phân quyền + avatar stack.
export default function MemberSection() {
  return (
    <div>
      <SectionTitle>Member module</SectionTitle>
      <SectionLead>
        Bộ organism cho quản lý thành viên & phân quyền workspace (workspace-service). Màu vai trò
        suy tự động từ chuỗi <code>role</code> (owner → accent, admin → tím, còn lại → trung tính).
        Các component đều presentational; riêng InviteForm/PermissionRow giữ state input/toggle nội
        bộ nhưng vẫn phát callback ra ngoài để container xử lý API.
      </SectionLead>

      {/* ---------- RoleTag ---------- */}
      <Doc
        name="RoleTag"
        tagline="Pill nhãn vai trò — màu suy từ role qua helper roleTone. Không phân biệt hoa/thường."
      >
        <GroupLabel>Các vai trò</GroupLabel>
        <Specimen label="owner · admin · member · (khác)">
          <RoleTag role="owner" />
          <RoleTag role="admin" />
          <RoleTag role="member" />
          <RoleTag role="viewer" />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'role',
              type: 'string',
              desc: 'Tên vai trò — vừa là màu (roleTone) vừa là nhãn hiển thị.',
            },
          ]}
        />
      </Doc>

      {/* ---------- MemberRow ---------- */}
      <Doc
        name="MemberRow"
        tagline="1 dòng thành viên: chip (avatar + tên + email) · role + ngày tham gia · nút Remove tuỳ chọn."
      >
        <GroupLabel>Có / không nút remove</GroupLabel>
        <Specimen label="Surface > MemberRow[]">
          <Surface style={{ width: '100%' }}>
            <MemberRow
              role="admin"
              name="Nguyễn Phương Thảo"
              email="thao@congty.com"
              joinedLabel="2 tháng trước"
              onRemove={noop}
            />
            <Divider />
            <MemberRow
              role="member"
              name="Lê Thu Hà"
              email="ha@congty.com"
              joinedLabel="2 tuần trước"
            />
          </Surface>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên hiển thị (avatar suy màu từ tên).' },
            {
              name: 'email',
              type: 'string',
              def: 'undefined',
              desc: 'Email phụ dưới tên (trong UserChip).',
            },
            { name: 'role', type: 'string', desc: 'Vai trò → render RoleTag.' },
            {
              name: 'joinedLabel',
              type: 'string',
              def: 'undefined',
              desc: 'Nhãn ngày tham gia. Ẩn nếu bỏ trống.',
            },
            {
              name: 'onRemove',
              type: '() => void',
              def: 'undefined',
              desc: 'Nút "Remove" (ghost). Ẩn nếu không truyền.',
            },
          ]}
        />
      </Doc>

      {/* ---------- MemberList ---------- */}
      <Doc
        name="MemberList"
        tagline="Danh sách thành viên hoàn chỉnh: Surface bọc, mỗi phần tử 1 MemberRow, Divider xen giữa. onRemove(id) định danh qua id."
      >
        <Specimen label="MemberList members={...}">
          <div style={{ width: '100%' }}>
            <MemberList members={members} onRemove={noop} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'members',
              type: 'MemberData[]',
              desc: 'Mảng { id, name, email?, role, joinedLabel? }.',
            },
            {
              name: 'onRemove',
              type: '(id) => void',
              def: 'undefined',
              desc: 'Gỡ 1 thành viên theo id. Không truyền → ẩn nút remove mọi dòng.',
            },
          ]}
        />
      </Doc>

      {/* ---------- InviteForm ---------- */}
      <Doc
        name="InviteForm"
        tagline="Form mời thành viên: nhập email + chọn vai trò + bấm Mời. Giữ state input nội bộ, phát onInvite(email, role) rồi reset email. Bỏ qua email rỗng."
      >
        <Specimen label="InviteForm onInvite={...}">
          <div style={{ width: '100%' }}>
            <InviteForm onInvite={noop} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'onInvite',
              type: '(email, role) => void',
              def: 'undefined',
              desc: 'Gọi khi submit form với email đã trim + role đã chọn.',
            },
          ]}
        />
      </Doc>

      {/* ---------- PermissionRow ---------- */}
      <Doc
        name="PermissionRow"
        tagline="Dòng phân quyền: nhãn + mô tả (trái) · switch bật/tắt (phải). Presentational — bấm switch phát onToggle, trạng thái do container giữ."
      >
        <GroupLabel>Bật / tắt (bấm thử)</GroupLabel>
        <Specimen label="role=switch · aria-checked">
          <PermissionDemo />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'label', type: 'string', desc: 'Tên quyền.' },
            {
              name: 'description',
              type: 'string',
              def: 'undefined',
              desc: 'Mô tả phụ dưới nhãn. Ẩn nếu bỏ trống.',
            },
            {
              name: 'allowed',
              type: 'boolean',
              desc: 'Trạng thái bật/tắt (điều khiển màu + vị trí núm).',
            },
            {
              name: 'onToggle',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm switch — container tự đảo allowed.',
            },
          ]}
        />
      </Doc>

      {/* ---------- MemberAvatarStack ---------- */}
      <Doc
        name="MemberAvatarStack"
        tagline="Nhóm avatar xếp chồng (đè nhau) + ô '+N' cho phần vượt max. Dùng hiển thị thành viên project/issue gọn gàng."
      >
        <GroupLabel>Theo số lượng & max</GroupLabel>
        <Specimen label="max mặc định (4) · max=2 · dưới max">
          <MemberAvatarStack names={members.map((m) => m.name)} />
          <MemberAvatarStack names={members.map((m) => m.name)} max={2} />
          <MemberAvatarStack names={['Nguyễn Phương Thảo', 'Trần Văn Minh']} />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'names', type: 'string[]', desc: 'Danh sách tên (avatar suy màu từ tên).' },
            {
              name: 'max',
              type: 'number',
              def: '4',
              desc: 'Số avatar tối đa trước khi gộp phần dư thành "+N".',
            },
          ]}
        />
      </Doc>
    </div>
  );
}
