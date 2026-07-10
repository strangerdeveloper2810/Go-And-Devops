import {
  Button,
  Divider,
  ProjectCard,
  ProjectRow,
  SettingItem,
  Surface,
  Tag,
  WorkspaceCard,
  WorkspaceSwitcher,
} from '@pm-platform/ui';
import { Fragment } from 'react';
import { Doc, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

// Project demo (key global-unique kiểu Jira, tiến độ 0-100 để thấy thanh fill).
const projects = [
  { id: 1, name: 'Nền tảng thanh toán', projectKey: 'PAY', issueCount: 42, progress: 68 },
  { id: 2, name: 'Ứng dụng di động khách hàng', projectKey: 'MOB', issueCount: 18, progress: 35 },
  { id: 3, name: 'Hạ tầng DevOps', projectKey: 'OPS', issueCount: 7, progress: 90 },
];

const noop = () => {};

// Module Workspace tài liệu hoá: switcher + project card/row + workspace card + setting item.
export default function WorkspaceSection() {
  return (
    <div>
      <SectionTitle>Workspace module</SectionTitle>
      <SectionLead>
        Bộ organism cho vùng làm việc (workspace-service): chuyển workspace, hiển thị project ở cả
        grid-view lẫn list-view, và các dòng cấu hình. Tất cả presentational — nhận dữ liệu qua
        props, phát callback ra ngoài. Thanh tiến độ luôn kẹp <code>progress</code> về [0,100] để
        fill không tràn.
      </SectionLead>

      {/* ---------- WorkspaceSwitcher ---------- */}
      <Doc
        name="WorkspaceSwitcher"
        tagline="Nút hiển thị workspace hiện tại (avatar suy màu + tên) kèm chevron gợi ý menu. Presentational — không tự mở dropdown."
      >
        <Specimen label="current + onClick">
          <WorkspaceSwitcher current="Cognisian" onClick={noop} />
          <WorkspaceSwitcher current="Đội Sản phẩm" onClick={noop} />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'current', type: 'string', desc: 'Tên workspace đang chọn (avatar + nhãn).' },
            {
              name: 'onClick',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm nút (mở menu chuyển workspace ở tầng container).',
            },
          ]}
        />
      </Doc>

      {/* ---------- ProjectCard ---------- */}
      <Doc
        name="ProjectCard"
        tagline="Thẻ project grid-view: mã key + tên + thanh tiến độ + số issue. Surface interactive (hover nâng nhẹ), click optional."
      >
        <GroupLabel>Lưới project</GroupLabel>
        <Specimen label="grid-view">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              width: '100%',
            }}
          >
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                name={p.name}
                projectKey={p.projectKey}
                issueCount={p.issueCount}
                progress={p.progress}
                onClick={noop}
              />
            ))}
          </div>
        </Specimen>
        <GroupLabel>Không có progress</GroupLabel>
        <Specimen label="ẩn thanh tiến độ">
          <div style={{ width: 240 }}>
            <ProjectCard name="Dự án mới khởi tạo" projectKey="NEW" issueCount={0} onClick={noop} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên project (ellipsis 1 dòng).' },
            { name: 'projectKey', type: 'string', desc: 'Mã key kiểu Jira (render IssueKey).' },
            { name: 'issueCount', type: 'number', def: '0', desc: 'Số issue hiển thị dưới tên.' },
            {
              name: 'progress',
              type: 'number',
              def: 'undefined',
              desc: 'Tiến độ 0–100. Bỏ trống → ẩn thanh tiến độ.',
            },
            { name: 'onClick', type: '() => void', def: 'undefined', desc: 'Bấm vào card.' },
          ]}
        />
      </Doc>

      {/* ---------- ProjectRow ---------- */}
      <Doc
        name="ProjectRow"
        tagline="Dòng project list-view compact: key + tên (co giãn) + thanh tiến độ (rộng cố định) + số issue. Mật độ cao hơn card."
      >
        <Specimen label="Surface > ProjectRow[] + Divider">
          <Surface style={{ width: '100%' }}>
            {projects.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <Divider /> : null}
                <ProjectRow
                  name={p.name}
                  projectKey={p.projectKey}
                  issueCount={p.issueCount}
                  progress={p.progress}
                />
              </Fragment>
            ))}
          </Surface>
        </Specimen>
        <GroupLabel>Không có progress</GroupLabel>
        <Specimen label="ẩn thanh tiến độ">
          <Surface style={{ width: '100%' }}>
            <ProjectRow name="Dự án mới khởi tạo" projectKey="NEW" issueCount={0} />
          </Surface>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên project (ellipsis, cột co giãn).' },
            { name: 'projectKey', type: 'string', desc: 'Mã key kiểu Jira (render IssueKey).' },
            { name: 'issueCount', type: 'number', def: '0', desc: 'Số issue (mono, canh phải).' },
            {
              name: 'progress',
              type: 'number',
              def: 'undefined',
              desc: 'Tiến độ 0–100. Bỏ trống → ẩn thanh.',
            },
          ]}
        />
      </Doc>

      {/* ---------- WorkspaceCard ---------- */}
      <Doc
        name="WorkspaceCard"
        tagline="Thẻ workspace: avatar (suy màu từ tên) + tên + tag gói + số thành viên. Tag gói đổi màu theo plan (enterprise → tím, pro/team → accent, free → trung tính)."
      >
        <GroupLabel>Theo gói dịch vụ</GroupLabel>
        <Specimen label="grid workspace">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
              width: '100%',
            }}
          >
            <WorkspaceCard name="Cognisian" plan="Enterprise" memberCount={128} onClick={noop} />
            <WorkspaceCard name="Đội Sản phẩm" plan="Pro" memberCount={24} onClick={noop} />
            <WorkspaceCard name="Cá nhân" plan="Free" memberCount={1} onClick={noop} />
          </div>
        </Specimen>
        <GroupLabel>Không plan / không click</GroupLabel>
        <Specimen label="tối giản (không interactive)">
          <div style={{ width: 260 }}>
            <WorkspaceCard name="Nhóm nghiên cứu" memberCount={6} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên workspace (avatar + nhãn, ellipsis).' },
            {
              name: 'plan',
              type: 'string',
              def: 'undefined',
              desc: 'Tên gói → render Tag đổi màu. Ẩn nếu bỏ trống.',
            },
            {
              name: 'memberCount',
              type: 'number',
              def: '0',
              desc: 'Số thành viên hiển thị dưới tên.',
            },
            {
              name: 'onClick',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm card. Có onClick → Surface interactive (hover nâng).',
            },
          ]}
        />
      </Doc>

      {/* ---------- SettingItem ---------- */}
      <Doc
        name="SettingItem"
        tagline="1 dòng trong trang Settings: tiêu đề + mô tả (trái) · action bất kỳ (phải). Action nhận ReactNode nên cắm Button/Tag/Switch tuỳ ý."
      >
        <Specimen label="Surface > SettingItem[] + Divider">
          <Surface style={{ width: '100%' }}>
            <SettingItem
              title="Tên workspace"
              description="Hiển thị trong sidebar và lời mời."
              action={
                <Button variant="subtle" size="sm">
                  Đổi tên
                </Button>
              }
            />
            <Divider />
            <SettingItem
              title="Quyền riêng tư"
              description="Ai có thể tìm thấy workspace này."
              action={<Tag tone="green">Riêng tư</Tag>}
            />
            <Divider />
            <SettingItem
              title="Xoá workspace"
              description="Xoá vĩnh viễn toàn bộ dữ liệu — không thể hoàn tác."
              action={
                <Button variant="danger" size="sm">
                  Xoá
                </Button>
              }
            />
            <Divider />
            <SettingItem
              title="Gói hiện tại"
              description="Nâng cấp để mở khoá tính năng nâng cao."
            />
          </Surface>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'title', type: 'string', desc: 'Tiêu đề dòng cài đặt.' },
            {
              name: 'description',
              type: 'string',
              def: 'undefined',
              desc: 'Mô tả phụ dưới tiêu đề. Ẩn nếu bỏ trống.',
            },
            {
              name: 'action',
              type: 'ReactNode',
              def: 'undefined',
              desc: 'Control bên phải (Button/Tag/Switch...). Ẩn nếu không truyền.',
            },
          ]}
        />
      </Doc>
    </div>
  );
}
