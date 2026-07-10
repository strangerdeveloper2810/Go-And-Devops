import {
  // molecules mới
  Alert,
  Badge,
  Breadcrumb,
  // atoms dùng để dựng specimen
  Button,
  Callout,
  Divider,
  DropdownMenu,
  Dropzone,
  // molecules cũ
  EmptyState,
  Field,
  Icon,
  Kbd,
  Modal,
  Pagination,
  ProgressBar,
  SearchInput,
  Spinner,
  StatPill,
  Surface,
  Tabs,
  Tag,
  Text,
  TextField,
  Toast,
  UserChip,
} from '@pm-platform/ui';
import { useState } from 'react';
import {
  Code,
  Doc,
  Grid,
  GroupLabel,
  PropsTable,
  Row,
  SectionLead,
  SectionTitle,
  Specimen,
} from '../kit';

// Section tài liệu Molecules — mỗi component 1 <Doc> với nhiều specimen (tone/variant/state)
// + bảng props. Bao gồm molecule cũ (EmptyState…Dropzone) lẫn mới (Alert…ProgressBar).
export default function MoleculesSection() {
  // State demo cho các molecule tương tác (presentational: state ở phía trình bày).
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(3);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <SectionTitle>Molecules</SectionTitle>
      <SectionLead>
        Molecule = tổ hợp nhiều atom thành một đơn vị giao diện có nghĩa (alert, tab, modal,
        breadcrumb…). Tất cả đều <strong>presentational</strong>: state dữ liệu do container giữ,
        molecule chỉ nhận props và phát callback. Màu sắc suy từ CSS variable của theme nên tự đổi
        theo light/dark.
      </SectionLead>

      {/* ============================ PHẢN HỒI & TRẠNG THÁI ============================ */}
      <GroupLabel>Phản hồi & trạng thái</GroupLabel>

      <Doc
        name="Alert"
        tagline="Thông báo inline theo ngữ cảnh — glyph + màu suy từ tone, đóng được."
      >
        <Specimen label="4 tone">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <Alert tone="info" title="Đang đồng bộ dữ liệu">
              Board sẽ tự cập nhật khi tác vụ nền hoàn tất.
            </Alert>
            <Alert tone="success" title="Đã lưu thay đổi">
              Issue PM-142 đã được chuyển sang cột Done.
            </Alert>
            <Alert tone="warning" title="Sắp hết dung lượng">
              Workspace đã dùng 92% hạn mức lưu trữ file.
            </Alert>
            <Alert tone="danger" title="Không thể xoá project">
              Còn 3 issue đang mở thuộc project này.
            </Alert>
          </div>
        </Specimen>
        <Specimen label="Có nút đóng · chỉ tiêu đề">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <Alert tone="info" title="Bạn có 4 lời mời workspace đang chờ" onClose={() => {}} />
            <Alert tone="danger" title="Phiên đăng nhập đã hết hạn" onClose={() => {}}>
              Đăng nhập lại để tiếp tục.
            </Alert>
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'tone',
              type: "'info' | 'success' | 'warning' | 'danger'",
              def: "'info'",
              desc: 'Quyết định màu viền/nền + glyph chỉ báo.',
            },
            { name: 'title', type: 'string', desc: 'Tiêu đề (bắt buộc).' },
            { name: 'children', type: 'ReactNode', desc: 'Mô tả phụ tuỳ chọn.' },
            { name: 'onClose', type: '() => void', desc: 'Có → hiện nút × để đóng.' },
          ]}
        />
      </Doc>

      <Doc
        name="Callout"
        tagline="Box ghi chú/tip nhấn mạnh — nền surface-2 + viền accent-dim trái, icon tuỳ chọn."
      >
        <Specimen label="Có icon">
          <Callout icon={<Icon name="inbox" size={18} />} title="Mẹo dùng bàn phím">
            Nhấn <Code>⌘K</Code> ở bất kỳ đâu để mở command palette và nhảy nhanh tới issue, page
            hay thành viên.
          </Callout>
        </Specimen>
        <Specimen label="Không icon">
          <Callout title="Về phân quyền">
            Chỉ chủ workspace (<Tag tone="accent">owner</Tag>) mới đổi được vai trò thành viên.
          </Callout>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'icon',
              type: 'ReactNode',
              desc: 'Icon dẫn (thường là <Icon/>), đặt bên trái.',
            },
            { name: 'title', type: 'string', desc: 'Tiêu đề callout (bắt buộc).' },
            { name: 'children', type: 'ReactNode', desc: 'Nội dung (bắt buộc).' },
          ]}
        />
      </Doc>

      <Doc
        name="Toast"
        tagline="Item thông báo nổi — stripe trái theo tone, đóng được. Thường xếp chồng góc màn."
      >
        <Specimen label="4 tone (có nút đóng)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toast tone="success" message="Đã tạo project “Mobile App”." onClose={() => {}} />
            <Toast tone="info" message="3 issue được gán cho bạn." onClose={() => {}} />
            <Toast tone="warning" message="Kết nối chậm — đang thử lại…" onClose={() => {}} />
            <Toast tone="danger" message="Upload thất bại: file quá lớn." onClose={() => {}} />
          </div>
        </Specimen>
        <Specimen label="Không nút đóng (tự ẩn)">
          <Toast tone="info" message="Đã sao chép link vào clipboard." />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'tone',
              type: "'info' | 'success' | 'warning' | 'danger'",
              def: "'info'",
              desc: 'Màu stripe trái.',
            },
            { name: 'message', type: 'string', desc: 'Nội dung thông báo (bắt buộc).' },
            { name: 'onClose', type: '() => void', desc: 'Có → hiện nút × để tắt sớm.' },
          ]}
        />
      </Doc>

      <Doc
        name="ProgressBar"
        tagline="Thanh tiến độ + nhãn %. value 0–100 (tự kẹp biên), label tuỳ chọn."
      >
        <Specimen label="Các mức tiến độ">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: 360,
              maxWidth: '100%',
            }}
          >
            <ProgressBar value={18} label="Sprint 7" />
            <ProgressBar value={64} label="Migration schema" />
            <ProgressBar value={100} label="Hoàn tất onboarding" />
          </div>
        </Specimen>
        <Specimen label="Không label · giá trị vượt biên (kẹp về 0/100)">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: 360,
              maxWidth: '100%',
            }}
          >
            <ProgressBar value={42} />
            <ProgressBar value={-20} label="Kẹp về 0%" />
            <ProgressBar value={140} label="Kẹp về 100%" />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'value',
              type: 'number',
              desc: 'Phần trăm 0–100 (giá trị ngoài biên tự kẹp, làm tròn).',
            },
            { name: 'label', type: 'string', desc: 'Nhãn bên trái hàng % (tuỳ chọn).' },
          ]}
        />
      </Doc>

      <Doc
        name="EmptyState"
        tagline="Trạng thái rỗng — icon + tiêu đề + mô tả + action, canh giữa."
      >
        <Specimen center label="Có action">
          <EmptyState
            icon={<Icon name="inbox" size={30} />}
            title="Chưa có issue nào"
            description="Tạo issue đầu tiên để bắt đầu theo dõi công việc trong project này."
            action={
              <Button variant="primary" size="sm">
                <Icon name="plus" size={15} /> Tạo issue
              </Button>
            }
          />
        </Specimen>
        <Specimen center label="Chỉ tiêu đề + mô tả">
          <EmptyState
            icon={<Icon name="search" size={30} />}
            title="Không tìm thấy kết quả"
            description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
          />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'icon', type: 'ReactNode', desc: 'Icon minh hoạ ở trên cùng.' },
            { name: 'title', type: 'string', desc: 'Tiêu đề (bắt buộc).' },
            { name: 'description', type: 'string', desc: 'Câu mô tả phụ.' },
            { name: 'action', type: 'ReactNode', desc: 'Nút hành động chính (vd Button tạo mới).' },
          ]}
        />
      </Doc>

      <Doc name="StatPill" tagline="Chỉ số nhỏ — giá trị (mono) + nhãn, gói trong pill surface-2.">
        <Specimen>
          <StatPill value={12} label="issues" />
          <StatPill value="68%" label="done" />
          <StatPill value={5} label="đang mở" />
          <StatPill value="3d" label="còn lại" />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'value', type: 'string | number', desc: 'Giá trị nổi bật (font mono).' },
            { name: 'label', type: 'string', desc: 'Nhãn mô tả bên cạnh.' },
          ]}
        />
      </Doc>

      {/* ============================ ĐIỀU HƯỚNG ============================ */}
      <GroupLabel>Điều hướng</GroupLabel>

      <Doc
        name="Tabs"
        tagline="Hàng tab — tab active gạch chân accent. State active do container giữ (controlled)."
      >
        <Specimen label={`value = "${tab}"`}>
          <div style={{ width: '100%' }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: 'overview', label: 'Tổng quan' },
                { key: 'board', label: 'Board' },
                { key: 'backlog', label: 'Backlog' },
                { key: 'settings', label: 'Cài đặt' },
              ]}
            />
            <div style={{ padding: '14px 4px', fontSize: 13, color: 'var(--text-mid)' }}>
              Nội dung tab: <Code>{tab}</Code>
            </div>
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'tabs', type: '{ key: string; label: string }[]', desc: 'Danh sách tab.' },
            { name: 'value', type: 'string', desc: 'key của tab đang active.' },
            { name: 'onChange', type: '(key: string) => void', desc: 'Gọi khi bấm tab khác.' },
          ]}
        />
      </Doc>

      <Doc
        name="Breadcrumb"
        tagline="Đường dẫn phân cấp — ngăn cách '/', item cuối là trang hiện tại (không click)."
      >
        <Specimen>
          <Breadcrumb
            items={[
              { label: 'Workspaces', onClick: () => {} },
              { label: 'Engineering', onClick: () => {} },
              { label: 'PM Platform', onClick: () => {} },
              { label: 'PM-142' },
            ]}
          />
        </Specimen>
        <Specimen label="2 cấp">
          <Breadcrumb items={[{ label: 'Spaces', onClick: () => {} }, { label: 'Kiến trúc' }]} />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'items',
              type: '{ label: string; onClick?: () => void }[]',
              desc: 'Các mắt xích; item cuối tự thành trang hiện tại (không bấm được).',
            },
          ]}
        />
      </Doc>

      <Doc
        name="Pagination"
        tagline="Phân trang — prev/next + số trang, active nền accent, chèn '…' khi nhiều trang."
      >
        <Specimen label={`page = ${page} / 12`}>
          <Pagination page={page} pageCount={12} onChange={setPage} />
        </Specimen>
        <Specimen label="Ít trang (hiện đủ)">
          <Pagination page={2} pageCount={4} onChange={() => {}} />
        </Specimen>
        <Specimen label="Biên: trang đầu / trang cuối (nút mờ)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Pagination page={1} pageCount={12} onChange={() => {}} />
            <Pagination page={12} pageCount={12} onChange={() => {}} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'page', type: 'number', desc: 'Trang hiện tại (1-based).' },
            { name: 'pageCount', type: 'number', desc: 'Tổng số trang.' },
            {
              name: 'onChange',
              type: '(page: number) => void',
              desc: 'Gọi khi chọn trang / prev / next.',
            },
          ]}
        />
      </Doc>

      <Doc
        name="DropdownMenu"
        tagline="Menu thả xuống — state open nội bộ (useState), click ngoài đóng. Item có icon + biến thể danger."
      >
        <Specimen label="Bấm trigger để mở">
          <Row>
            <DropdownMenu
              trigger={
                <Button variant="subtle" size="sm">
                  Thao tác <Icon name="chevron" size={14} />
                </Button>
              }
              items={[
                { label: 'Đổi tên', icon: <Icon name="doc" size={15} />, onClick: () => {} },
                { label: 'Nhân bản', icon: <Icon name="file" size={15} />, onClick: () => {} },
                { label: 'Cài đặt', icon: <Icon name="settings" size={15} />, onClick: () => {} },
                {
                  label: 'Xoá project',
                  icon: <Icon name="logout" size={15} />,
                  danger: true,
                  onClick: () => {},
                },
              ]}
            />
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="sm">
                  Tài khoản ▾
                </Button>
              }
              items={[
                { label: 'Hồ sơ', icon: <Icon name="users" size={15} />, onClick: () => {} },
                {
                  label: 'Đăng xuất',
                  icon: <Icon name="logout" size={15} />,
                  danger: true,
                  onClick: () => {},
                },
              ]}
            />
          </Row>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'trigger', type: 'ReactNode', desc: 'Phần tử bấm để bật/tắt menu.' },
            {
              name: 'items',
              type: '{ label; icon?; onClick?; danger? }[]',
              desc: 'Mục menu; danger → tô đỏ (hành động phá huỷ).',
            },
          ]}
        />
      </Doc>

      {/* ============================ OVERLAY ============================ */}
      <GroupLabel>Overlay</GroupLabel>

      <Doc
        name="Modal"
        tagline="Overlay + panel giữa màn — đóng khi click nền hoặc nhấn ESC. Có header + body + footer tuỳ chọn."
      >
        <Specimen>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Mở modal demo
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Xoá project?"
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                  Huỷ
                </Button>
                <Button variant="danger" size="sm" onClick={() => setModalOpen(false)}>
                  Xoá vĩnh viễn
                </Button>
              </>
            }
          >
            Hành động này không thể hoàn tác. Toàn bộ issue và board thuộc project sẽ bị gỡ khỏi
            workspace. Nhấn <Code>ESC</Code> hoặc click nền để đóng.
          </Modal>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'open', type: 'boolean', desc: 'Đang mở hay không (controlled).' },
            {
              name: 'onClose',
              type: '() => void',
              desc: 'Gọi khi click nền, nhấn ESC, hoặc nút ×.',
            },
            { name: 'title', type: 'string', desc: 'Tiêu đề header.' },
            { name: 'children', type: 'ReactNode', desc: 'Nội dung body.' },
            { name: 'footer', type: 'ReactNode', desc: 'Hàng nút cuối (canh phải), tuỳ chọn.' },
          ]}
        />
      </Doc>

      {/* ============================ FORM & NHẬP LIỆU ============================ */}
      <GroupLabel>Form & nhập liệu</GroupLabel>

      <Doc
        name="Field"
        tagline="Wrapper form-field: label + control bất kỳ + error. Khác TextField atom (vốn gắn input sẵn)."
      >
        <Specimen label="Bình thường · lỗi validation">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: 320,
              maxWidth: '100%',
            }}
          >
            <Field label="Tên project">
              <TextField placeholder="vd. Mobile App" />
            </Field>
            <Field label="Project key" error="Key đã tồn tại trong hệ thống">
              <TextField placeholder="PM" defaultValue="PM" />
            </Field>
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'label', type: 'ReactNode', desc: 'Nhãn phía trên control.' },
            { name: 'error', type: 'string', desc: 'Có → hiện dòng lỗi đỏ dưới control.' },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Control bất kỳ (input, select, TextField…).',
            },
          ]}
        />
      </Doc>

      <Doc
        name="SearchInput"
        tagline="Ô tìm kiếm — icon dẫn + input + trailing (vd phím tắt). Nhận mọi prop của <input>."
      >
        <Specimen label="Có icon + phím tắt">
          <div style={{ width: 320, maxWidth: '100%' }}>
            <SearchInput
              icon={<Icon name="search" size={16} />}
              placeholder="Tìm issue, page, người…"
              trailing={<Kbd>⌘K</Kbd>}
            />
          </div>
        </Specimen>
        <Specimen label="Tối giản">
          <div style={{ width: 320, maxWidth: '100%' }}>
            <SearchInput placeholder="Lọc nhanh…" />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'icon', type: 'ReactNode', desc: 'Icon bên trái (thường icon search).' },
            {
              name: 'trailing',
              type: 'ReactNode',
              desc: 'Phần tử cuối (Kbd, spinner, nút clear…).',
            },
            {
              name: '...rest',
              type: 'InputHTMLAttributes',
              desc: 'value, onChange, placeholder… truyền thẳng vào <input>.',
            },
          ]}
        />
      </Doc>

      <Doc
        name="Dropzone"
        tagline="Vùng kéo-thả upload — presentational: trạng thái active + click do container điều khiển."
      >
        <Specimen label="Mặc định · active (đang hover file)">
          <Grid min={240} style={{ width: '100%' }}>
            <Dropzone icon={<Icon name="file" size={26} />} />
            <Dropzone
              active
              icon={<Icon name="file" size={26} />}
              title="Thả để tải lên"
              hint="PNG, PDF, tối đa 25MB"
            />
          </Grid>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'icon', type: 'ReactNode', desc: 'Icon minh hoạ.' },
            { name: 'title', type: 'string', def: "'Kéo thả file vào đây'", desc: 'Dòng chính.' },
            { name: 'hint', type: 'string', def: "'hoặc bấm để chọn'", desc: 'Gợi ý phụ.' },
            {
              name: 'active',
              type: 'boolean',
              desc: 'True → viền/nền accent (đang kéo file vào).',
            },
            { name: 'onClick', type: '() => void', desc: 'Bấm để mở hộp chọn file.' },
          ]}
        />
      </Doc>

      {/* ============================ HIỂN THỊ DỮ LIỆU ============================ */}
      <GroupLabel>Hiển thị dữ liệu</GroupLabel>

      <Doc
        name="UserChip"
        tagline="Avatar + tên (+ meta) — dùng cho assignee, member, mention. Kích thước avatar tuỳ chỉnh."
      >
        <Specimen>
          <UserChip name="Ethan Nguyen" meta="ethan@pm.dev" />
          <UserChip name="Mai Trần" meta="Owner" />
          <UserChip name="QA Bot" />
          <UserChip name="Lê Văn A" meta="size 34" size={34} />
        </Specimen>
        <Specimen label="Trong ngữ cảnh (Surface + Divider)">
          <Surface style={{ padding: 12, width: 300, maxWidth: '100%' }}>
            <UserChip name="Ethan Nguyen" meta="Đã gán · 2 giờ trước" />
            <Divider style={{ margin: '10px 0' }} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="muted">Trạng thái</Text>
              <Tag tone="green">Active</Tag>
            </Row>
          </Surface>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'name',
              type: 'string',
              desc: 'Tên hiển thị; cũng suy ra initials + màu avatar.',
            },
            { name: 'meta', type: 'string', desc: 'Dòng phụ (email, vai trò, thời gian).' },
            { name: 'size', type: 'number', def: '26', desc: 'Đường kính avatar (px).' },
          ]}
        />
      </Doc>

      <Doc
        name="Kết hợp"
        tagline="Vài molecule cùng phối trong một card thực tế — minh hoạ khả năng lắp ghép."
      >
        <Specimen center>
          <Surface style={{ padding: 18, width: 420, maxWidth: '100%' }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <Text variant="h3">Sprint 7</Text>
              <Row>
                <Badge>12</Badge>
                <DropdownMenu
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Icon name="settings" size={16} />
                    </Button>
                  }
                  items={[
                    { label: 'Sửa sprint', icon: <Icon name="doc" size={15} />, onClick: () => {} },
                    {
                      label: 'Kết thúc sprint',
                      icon: <Icon name="check" size={15} />,
                      onClick: () => {},
                    },
                  ]}
                />
              </Row>
            </Row>
            <ProgressBar value={64} label="Tiến độ" />
            <Divider style={{ margin: '14px 0' }} />
            <Row style={{ justifyContent: 'space-between' }}>
              <UserChip name="Ethan Nguyen" meta="Sprint lead" />
              <Row>
                <StatPill value={5} label="đang mở" />
                <Spinner size={16} />
              </Row>
            </Row>
          </Surface>
        </Specimen>
      </Doc>
    </div>
  );
}
