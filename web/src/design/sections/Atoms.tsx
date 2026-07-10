import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Checkbox,
  Divider,
  Icon,
  type IconName,
  IssueKey,
  Kbd,
  PriorityDot,
  Progress,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Tag,
  Text,
  TextField,
  Tooltip,
} from '@pm-platform/ui';
import { type ReactNode, useState } from 'react';
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

// ── Demo wrappers có state (section được phép dùng hook; atom vẫn presentational) ──

const SwitchDemo = ({ start = false }: { start?: boolean }) => {
  const [on, setOn] = useState(start);
  return <Switch checked={on} onChange={setOn} />;
};

const CheckboxDemo = ({ label, start = false }: { label?: string; start?: boolean }) => {
  const [on, setOn] = useState(start);
  return <Checkbox checked={on} onChange={setOn} label={label} />;
};

const SelectDemo = () => {
  const [v, setV] = useState('doing');
  return (
    <div style={{ width: 220 }}>
      <Select
        value={v}
        onChange={setV}
        options={[
          { value: 'todo', label: 'To do' },
          { value: 'doing', label: 'In progress' },
          { value: 'review', label: 'In review' },
          { value: 'done', label: 'Done' },
        ]}
      />
    </div>
  );
};

const ProgressDemo = () => {
  const [v, setV] = useState(60);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <Progress value={v} />
      <Row>
        <Button size="xs" onClick={() => setV((x) => Math.max(0, x - 10))}>
          -10
        </Button>
        <Button size="xs" onClick={() => setV((x) => Math.min(100, x + 10))}>
          +10
        </Button>
        <Text variant="mono">{v}%</Text>
      </Row>
    </div>
  );
};

const Col = ({ children, w }: { children: ReactNode; w?: number | string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: w ?? '100%' }}>
    {children}
  </div>
);

const ALL_ICONS: IconName[] = [
  'board',
  'doc',
  'file',
  'users',
  'search',
  'plus',
  'logout',
  'chevron',
  'settings',
  'inbox',
  'check',
  'clock',
  'sun',
  'moon',
  'palette',
  'back',
];

export default function AtomsSection() {
  return (
    <div>
      <SectionTitle>Atoms</SectionTitle>
      <SectionLead>
        Những khối dựng nhỏ nhất của design system — thuần trình bày (props → UI, không hook /
        fetch), style bằng MUI <Code>styled</Code> trên nền CSS variables theme. Mỗi atom dưới đây
        có đủ variants · sizes · states và bảng props. Tất cả import từ <Code>@pm-platform/ui</Code>
        .
      </SectionLead>

      {/* ══════════════════════ HÀNH ĐỘNG ══════════════════════ */}
      <GroupLabel>Hành động</GroupLabel>

      <Doc
        name="Button"
        tagline="Nút bấm console — 4 variant × 4 size, hỗ trợ icon, loading, full-width."
      >
        <Specimen label="variant: primary · subtle · ghost · danger">
          <Button variant="primary">Primary</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Specimen>

        <Specimen label="size: xs · sm · md · lg">
          <Button variant="primary" size="xs">
            Extra small
          </Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </Specimen>

        <Specimen label="icon + label">
          <Button variant="primary">
            <Icon name="plus" size={16} /> New issue
          </Button>
          <Button variant="subtle">
            <Icon name="search" size={16} /> Search
          </Button>
          <Button variant="ghost">
            <Icon name="settings" size={16} /> Settings
          </Button>
        </Specimen>

        <Specimen label="iconOnly (padding vuông) — xs · sm · md · lg">
          <Button variant="subtle" iconOnly size="xs" aria-label="Add">
            <Icon name="plus" size={14} />
          </Button>
          <Button variant="subtle" iconOnly size="sm" aria-label="Add">
            <Icon name="plus" size={16} />
          </Button>
          <Button variant="subtle" iconOnly size="md" aria-label="Add">
            <Icon name="plus" size={18} />
          </Button>
          <Button variant="subtle" iconOnly size="lg" aria-label="Add">
            <Icon name="plus" size={20} />
          </Button>
        </Specimen>

        <Specimen label="loading (Spinner + tự disable)">
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="subtle" loading>
            Loading
          </Button>
        </Specimen>

        <Specimen label="disabled">
          <Button variant="primary" disabled>
            Primary
          </Button>
          <Button variant="subtle" disabled>
            Subtle
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
        </Specimen>

        <Specimen label="fullWidth">
          <Col w={360}>
            <Button variant="primary" fullWidth>
              Continue
            </Button>
            <Button variant="subtle" fullWidth>
              Cancel
            </Button>
          </Col>
        </Specimen>

        <PropsTable
          rows={[
            {
              name: 'variant',
              type: "'primary' | 'ghost' | 'subtle' | 'danger'",
              def: "'subtle'",
              desc: 'Kiểu hiển thị — primary = lime đặc, danger = đỏ mờ.',
            },
            {
              name: 'size',
              type: "'xs' | 'sm' | 'md' | 'lg'",
              def: "'md'",
              desc: 'Kích thước (font + padding).',
            },
            {
              name: 'iconOnly',
              type: 'boolean',
              def: 'false',
              desc: 'Padding vuông cho nút chỉ chứa 1 icon.',
            },
            {
              name: 'loading',
              type: 'boolean',
              def: 'false',
              desc: 'Hiện Spinner phía trước và tự disable nút.',
            },
            {
              name: 'fullWidth',
              type: 'boolean',
              def: 'false',
              desc: 'Giãn rộng 100% container (display flex).',
            },
            {
              name: 'disabled',
              type: 'boolean',
              def: 'false',
              desc: 'Vô hiệu hoá (opacity 0.45, không nhận click).',
            },
            {
              name: 'onClick',
              type: '(e) => void',
              desc: 'Handler click (kế thừa từ button HTML).',
            },
            {
              name: 'type',
              type: "'button' | 'submit' | 'reset'",
              desc: 'Thuộc tính button HTML tiêu chuẩn.',
            },
            { name: 'children', type: 'ReactNode', desc: 'Nội dung — text và/hoặc Icon.' },
          ]}
        />
      </Doc>

      {/* ══════════════════════ DANH TÍNH & NHÃN ══════════════════════ */}
      <GroupLabel>Danh tính &amp; nhãn</GroupLabel>

      <Doc
        name="Tag"
        tagline="Pill trạng thái / nhãn / label. 7 tone, biến thể soft (mặc định) và solid."
      >
        <Specimen label="tone (soft) — nền color-mix mờ">
          <Tag tone="neutral">neutral</Tag>
          <Tag tone="red">red</Tag>
          <Tag tone="amber">amber</Tag>
          <Tag tone="blue">blue</Tag>
          <Tag tone="green">green</Tag>
          <Tag tone="violet">violet</Tag>
          <Tag tone="accent">accent</Tag>
        </Specimen>

        <Specimen label="solid — nền đặc màu tone, chữ contrast">
          <Tag solid tone="red">
            Blocked
          </Tag>
          <Tag solid tone="amber">
            In progress
          </Tag>
          <Tag solid tone="blue">
            Review
          </Tag>
          <Tag solid tone="green">
            Done
          </Tag>
          <Tag solid tone="violet">
            Story
          </Tag>
          <Tag solid tone="accent">
            Priority
          </Tag>
        </Specimen>

        <Specimen label="size: sm · md">
          <Tag size="sm" tone="green">
            small
          </Tag>
          <Tag size="md" tone="green">
            medium
          </Tag>
          <Tag size="sm" solid tone="blue">
            small
          </Tag>
          <Tag size="md" solid tone="blue">
            medium
          </Tag>
        </Specimen>

        <Specimen label="với icon / dot bên trong">
          <Tag tone="green">
            <Icon name="check" size={12} /> Merged
          </Tag>
          <Tag tone="amber">
            <PriorityDot priority="medium" /> Medium
          </Tag>
          <Tag tone="blue">
            <Icon name="clock" size={12} /> 3d left
          </Tag>
        </Specimen>

        <PropsTable
          rows={[
            {
              name: 'tone',
              type: "'neutral' | 'red' | 'amber' | 'blue' | 'green' | 'violet' | 'accent'",
              def: "'neutral'",
              desc: 'Màu chủ đạo suy ra nền + viền + chữ.',
            },
            {
              name: 'size',
              type: "'sm' | 'md'",
              def: "'md'",
              desc: 'Kích thước pill (font + padding).',
            },
            {
              name: 'solid',
              type: 'boolean',
              def: 'false',
              desc: 'Nền đặc màu tone, chữ tối/contrast (nhấn mạnh).',
            },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Nhãn — text kèm Icon/PriorityDot tuỳ ý.',
            },
          ]}
        />
      </Doc>

      <Doc name="Badge" tagline="Nhãn đếm nhỏ (mono) — vd số lượng issue trong cột board.">
        <Specimen label="mặc định">
          <Badge>3</Badge>
          <Badge>12</Badge>
          <Badge>128</Badge>
          <Badge>99+</Badge>
        </Specimen>
        <Specimen label="trong ngữ cảnh (cạnh label)">
          <Row>
            <Text variant="body">To do</Text> <Badge>5</Badge>
          </Row>
          <Row>
            <Text variant="body">In progress</Text> <Badge>2</Badge>
          </Row>
          <Row>
            <Text variant="body">Done</Text> <Badge>17</Badge>
          </Row>
        </Specimen>
        <PropsTable
          rows={[{ name: 'children', type: 'ReactNode', desc: 'Nội dung đếm — thường là số.' }]}
        />
      </Doc>

      <Doc
        name="Avatar"
        tagline="Avatar chữ cái đầu, màu nền suy định từ tên (ổn định). Kèm status dot + AvatarGroup."
      >
        <Specimen label="size: 22 · 26 · 30 · 40">
          <Avatar name="Alan Turing" size={22} />
          <Avatar name="Grace Hopper" size={26} />
          <Avatar name="Linus Torvalds" size={30} />
          <Avatar name="Ada Lovelace" size={40} />
        </Specimen>

        <Specimen label="status: online · busy · offline">
          <Avatar name="Ada Lovelace" size={40} status="online" />
          <Avatar name="Alan Turing" size={40} status="busy" />
          <Avatar name="Grace Hopper" size={40} status="offline" />
        </Specimen>

        <Specimen label="màu suy từ tên (fallback = initials / ?)">
          <Avatar name="Katherine Johnson" size={32} />
          <Avatar name="Dennis Ritchie" size={32} />
          <Avatar name="Margaret Hamilton" size={32} />
          <Avatar name="Q" size={32} />
        </Specimen>

        <Specimen label="AvatarGroup — xếp chồng + overflow +N">
          <AvatarGroup
            size={30}
            avatars={[{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }, { name: 'Grace Hopper' }]}
          />
          <AvatarGroup
            size={30}
            max={4}
            avatars={[
              { name: 'Ada Lovelace' },
              { name: 'Alan Turing' },
              { name: 'Grace Hopper' },
              { name: 'Linus Torvalds' },
              { name: 'Dennis Ritchie' },
              { name: 'Katherine Johnson' },
            ]}
          />
        </Specimen>

        <PropsTable
          rows={[
            {
              name: 'name',
              type: 'string',
              desc: 'Tên hiển thị → initials + màu nền hash ổn định.',
            },
            { name: 'size', type: 'number', def: '26', desc: 'Đường kính px.' },
            {
              name: 'status',
              type: "'online' | 'offline' | 'busy'",
              desc: 'Chấm trạng thái góc dưới-phải (tuỳ chọn).',
            },
          ]}
        />
        <div style={{ marginTop: 14 }}>
          <GroupLabel>AvatarGroup</GroupLabel>
          <PropsTable
            rows={[
              {
                name: 'avatars',
                type: '{ name: string }[]',
                desc: 'Danh sách người dùng để render xếp chồng.',
              },
              {
                name: 'max',
                type: 'number',
                def: '4',
                desc: 'Số avatar tối đa hiển thị, dư gộp thành "+N".',
              },
              { name: 'size', type: 'number', def: '26', desc: 'Đường kính từng avatar.' },
            ]}
          />
        </div>
      </Doc>

      <Doc
        name="PriorityDot"
        tagline="Chấm priority có glow nhẹ (halo color-mix) — dùng cạnh issue key / title."
      >
        <Specimen label="priority: highest · high · medium · low · lowest">
          <Row>
            <PriorityDot priority="highest" /> <Text variant="muted">Highest</Text>
          </Row>
          <Row>
            <PriorityDot priority="high" /> <Text variant="muted">High</Text>
          </Row>
          <Row>
            <PriorityDot priority="medium" /> <Text variant="muted">Medium</Text>
          </Row>
          <Row>
            <PriorityDot priority="low" /> <Text variant="muted">Low</Text>
          </Row>
          <Row>
            <PriorityDot priority="lowest" /> <Text variant="muted">Lowest</Text>
          </Row>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'priority',
              type: "'highest' | 'high' | 'medium' | 'low' | 'lowest'",
              def: "'medium'",
              desc: 'Mức độ → màu chấm (đỏ / hổ phách / xanh / xám).',
            },
          ]}
        />
      </Doc>

      <Doc name="IssueKey" tagline="Mã issue kiểu Jira (APOLLO-12) — mono, chip nhỏ hairline.">
        <Specimen label="mặc định">
          <IssueKey>APOLLO-12</IssueKey>
          <IssueKey>GRAPH-402</IssueKey>
          <IssueKey>PLATFORM-7</IssueKey>
        </Specimen>
        <Specimen label="trong hàng issue">
          <Row>
            <PriorityDot priority="high" />
            <IssueKey>APOLLO-12</IssueKey>
            <Text variant="body">Refactor gateway auth middleware</Text>
          </Row>
        </Specimen>
        <PropsTable
          rows={[{ name: 'children', type: 'ReactNode', desc: 'Chuỗi mã issue, vd <KEY>-<n>.' }]}
        />
      </Doc>

      <Doc name="Kbd" tagline="Phím tắt (⌘K) — mono, viền dưới dày tạo cảm giác phím.">
        <Specimen label="phím đơn">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <Kbd>Esc</Kbd>
          <Kbd>↵</Kbd>
        </Specimen>
        <Specimen label="tổ hợp (combo)">
          <Row>
            <Kbd>⌘</Kbd> <Kbd>K</Kbd> <Text variant="muted">Command palette</Text>
          </Row>
          <Row>
            <Kbd>⌘</Kbd> <Kbd>⇧</Kbd> <Kbd>P</Kbd> <Text variant="muted">Quick switch</Text>
          </Row>
        </Specimen>
        <PropsTable rows={[{ name: 'children', type: 'ReactNode', desc: 'Ký hiệu phím.' }]} />
      </Doc>

      {/* ══════════════════════ TYPOGRAPHY ══════════════════════ */}
      <GroupLabel>Typography</GroupLabel>

      <Doc name="Text" tagline="Atom typography — 7 variant theo thang chữ của design system.">
        <Specimen>
          <Col>
            <Text variant="h1">The quick brown fox — h1</Text>
            <Text variant="h2">The quick brown fox — h2</Text>
            <Text variant="h3">The quick brown fox — h3</Text>
            <Text variant="body">The quick brown fox jumps over the lazy dog — body</Text>
            <Text variant="muted">Supporting muted text — muted</Text>
            <Text variant="caption">CAPTION / META — caption</Text>
            <Text variant="mono">const x = 42 · mono</Text>
          </Col>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'variant',
              type: "'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'caption' | 'mono'",
              def: "'body'",
              desc: 'Chọn bậc typography (size / weight / màu).',
            },
            { name: 'children', type: 'ReactNode', desc: 'Nội dung chữ.' },
          ]}
        />
      </Doc>

      <Doc name="Divider" tagline="Đường kẻ hairline ngăn cách nội dung.">
        <Specimen>
          <Col>
            <Text variant="muted">Phần trên</Text>
            <Divider />
            <Text variant="muted">Phần dưới</Text>
          </Col>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'style',
              type: 'CSSProperties',
              desc: 'Ghi đè margin/màu khi cần (là thẻ <hr>).',
            },
          ]}
        />
      </Doc>

      {/* ══════════════════════ FORM CONTROLS ══════════════════════ */}
      <GroupLabel>Form controls</GroupLabel>

      <Doc name="TextField" tagline="Ô nhập liệu có label — style surface-1, focus ring accent.">
        <Specimen label="có label + placeholder">
          <Col w={280}>
            <TextField label="Email" placeholder="you@company.com" />
          </Col>
        </Specimen>
        <Specimen label="không label / password / disabled">
          <Col w={280}>
            <TextField placeholder="Không label…" />
            <TextField label="Password" type="password" defaultValue="secret" />
            <TextField label="Read-only" value="disabled value" disabled />
          </Col>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'label', type: 'ReactNode', desc: 'Nhãn phía trên input (ẩn nếu bỏ trống).' },
            { name: 'placeholder', type: 'string', desc: 'Gợi ý khi rỗng.' },
            {
              name: 'value / defaultValue',
              type: 'string',
              desc: 'Controlled / uncontrolled (input HTML).',
            },
            { name: 'onChange', type: '(e) => void', desc: 'Handler thay đổi.' },
            {
              name: 'type',
              type: 'string',
              def: "'text'",
              desc: 'Loại input HTML (text, password, email…).',
            },
            { name: 'disabled', type: 'boolean', def: 'false', desc: 'Vô hiệu hoá.' },
            {
              name: '…rest',
              type: 'InputHTMLAttributes',
              desc: 'Mọi thuộc tính input HTML khác được forward.',
            },
          ]}
        />
      </Doc>

      <Doc
        name="Switch"
        tagline="Toggle bật/tắt — controlled, bật thì track nền accent, thumb trượt."
      >
        <Specimen label="tắt · bật (bấm để đổi)">
          <SwitchDemo start={false} />
          <SwitchDemo start />
        </Specimen>
        <Specimen label="disabled (tắt · bật)">
          <Switch checked={false} disabled />
          <Switch checked disabled />
        </Specimen>
        <Specimen label="cạnh nhãn">
          <Row>
            <SwitchDemo start />
            <Text variant="body">Email notifications</Text>
          </Row>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'checked',
              type: 'boolean',
              def: 'false',
              desc: 'Trạng thái bật/tắt (controlled).',
            },
            {
              name: 'onChange',
              type: '(checked: boolean) => void',
              desc: 'Gọi khi bấm, nhận giá trị mới.',
            },
            { name: 'disabled', type: 'boolean', def: 'false', desc: 'Vô hiệu hoá.' },
          ]}
        />
      </Doc>

      <Doc
        name="Checkbox"
        tagline="Ô chọn vuông bo nhẹ — tick Icon 'check' khi checked, có label tuỳ chọn."
      >
        <Specimen label="chưa chọn · đã chọn (bấm để đổi)">
          <CheckboxDemo start={false} />
          <CheckboxDemo start />
        </Specimen>
        <Specimen label="có label">
          <Col>
            <CheckboxDemo label="Nhớ đăng nhập" start />
            <CheckboxDemo label="Gửi bản tin hàng tuần" />
          </Col>
        </Specimen>
        <Specimen label="disabled (chưa chọn · đã chọn)">
          <Checkbox checked={false} disabled label="Không khả dụng" />
          <Checkbox checked disabled label="Đã khoá" />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'checked',
              type: 'boolean',
              def: 'false',
              desc: 'Đã chọn hay chưa (controlled).',
            },
            {
              name: 'onChange',
              type: '(checked: boolean) => void',
              desc: 'Gọi khi toggle, nhận giá trị mới.',
            },
            { name: 'disabled', type: 'boolean', def: 'false', desc: 'Vô hiệu hoá.' },
            { name: 'label', type: 'ReactNode', desc: 'Nhãn cạnh ô (tuỳ chọn).' },
          ]}
        />
      </Doc>

      <Doc name="Select" tagline="Dropdown native được style khớp TextField — chevron tự vẽ.">
        <Specimen label="chọn giá trị (native menu)">
          <SelectDemo />
        </Specimen>
        <Specimen label="disabled">
          <div style={{ width: 220 }}>
            <Select value="done" disabled options={[{ value: 'done', label: 'Done' }]} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'value', type: 'string', desc: 'Giá trị đang chọn (controlled).' },
            { name: 'onChange', type: '(value: string) => void', desc: 'Gọi khi đổi lựa chọn.' },
            {
              name: 'options',
              type: '{ value: string; label: string }[]',
              desc: 'Danh sách tuỳ chọn.',
            },
            { name: 'disabled', type: 'boolean', def: 'false', desc: 'Vô hiệu hoá.' },
          ]}
        />
      </Doc>

      {/* ══════════════════════ PHẢN HỒI (FEEDBACK) ══════════════════════ */}
      <GroupLabel>Phản hồi (feedback)</GroupLabel>

      <Doc
        name="Tooltip"
        tagline="Rê chuột / focus vào children để hiện label — CSS thuần, có caret."
      >
        <Specimen label="hover các phần tử bên dưới" center>
          <Tooltip label="Tạo issue mới">
            <Button variant="subtle" iconOnly aria-label="New">
              <Icon name="plus" size={18} />
            </Button>
          </Tooltip>
          <Tooltip label="Tìm kiếm (⌘K)">
            <Button variant="ghost">
              <Icon name="search" size={16} /> Search
            </Button>
          </Tooltip>
          <Tooltip label="Avatar có tooltip">
            <Avatar name="Ada Lovelace" size={32} />
          </Tooltip>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'label',
              type: 'ReactNode',
              desc: 'Nội dung tooltip (string còn set title= a11y fallback).',
            },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Phần tử kích hoạt tooltip khi hover/focus.',
            },
          ]}
        />
      </Doc>

      <Doc
        name="Progress"
        tagline="Thanh tiến trình — value 0-100 (tự clamp), track surface-3 + fill theo tone."
      >
        <Specimen label="các mức value">
          <Col>
            <Progress value={15} />
            <Progress value={50} />
            <Progress value={80} />
            <Progress value={100} />
          </Col>
        </Specimen>
        <Specimen label="tone: accent · blue · green · amber · red">
          <Col>
            <Progress value={70} tone="accent" />
            <Progress value={70} tone="blue" />
            <Progress value={70} tone="green" />
            <Progress value={70} tone="amber" />
            <Progress value={70} tone="red" />
          </Col>
        </Specimen>
        <Specimen label="interactive (animate khi đổi value)">
          <ProgressDemo />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'value',
              type: 'number',
              desc: 'Phần trăm 0-100 (giá trị ngoài khoảng bị clamp).',
            },
            {
              name: 'tone',
              type: "'neutral' | 'red' | 'amber' | 'blue' | 'green' | 'violet' | 'accent'",
              def: "'accent'",
              desc: 'Màu phần fill.',
            },
          ]}
        />
      </Doc>

      <Doc name="Spinner" tagline="Vòng xoay loading — border-strong + đỉnh accent, quay 0.7s.">
        <Specimen label="size: 14 · 16 · 24 · 32" center>
          <Spinner size={14} />
          <Spinner size={16} />
          <Spinner size={24} />
          <Spinner size={32} />
        </Specimen>
        <PropsTable rows={[{ name: 'size', type: 'number', def: '16', desc: 'Đường kính px.' }]} />
      </Doc>

      <Doc name="Skeleton" tagline="Khối placeholder loading với hiệu ứng shimmer chạy ngang.">
        <Specimen label="dòng text (width/height khác nhau)">
          <Col w={360}>
            <Skeleton width="70%" height={18} />
            <Skeleton height={12} />
            <Skeleton height={12} />
            <Skeleton width="45%" height={12} />
          </Col>
        </Specimen>
        <Specimen label="card skeleton (avatar tròn + dòng)">
          <Row>
            <Skeleton width={40} height={40} radius="50%" />
            <Col w={220}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="90%" height={10} />
            </Col>
          </Row>
        </Specimen>
        <Specimen label="khối lớn (thumbnail)">
          <Skeleton width={200} height={120} radius="var(--r-lg)" />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'width',
              type: 'number | string',
              def: "'100%'",
              desc: 'Chiều rộng (px hoặc %/CSS).',
            },
            { name: 'height', type: 'number | string', def: '14', desc: 'Chiều cao.' },
            {
              name: 'radius',
              type: 'number | string',
              def: 'var(--r-sm)',
              desc: 'Bo góc — dùng 50% cho hình tròn.',
            },
          ]}
        />
      </Doc>

      {/* ══════════════════════ ICONOGRAPHY ══════════════════════ */}
      <GroupLabel>Iconography</GroupLabel>

      <Doc
        name="Icon"
        tagline="Line-icon (stroke currentColor) hợp thẩm mỹ console — kế thừa màu chữ cha."
      >
        <Specimen label={`name: ${ALL_ICONS.length} icon (currentColor)`}>
          <Grid min={92} style={{ width: '100%' }}>
            {ALL_ICONS.map((n) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--text-hi)',
                }}
              >
                <Icon name={n} size={20} />
                <span
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-lo)' }}
                >
                  {n}
                </span>
              </div>
            ))}
          </Grid>
        </Specimen>
        <Specimen label="size: 14 · 18 · 24 · 32 · kế thừa màu (accent)">
          <Row>
            <Icon name="settings" size={14} />
            <Icon name="settings" size={18} />
            <Icon name="settings" size={24} />
            <Icon name="settings" size={32} />
            <span style={{ color: 'var(--accent)' }}>
              <Icon name="settings" size={24} />
            </span>
          </Row>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'IconName', desc: 'Tên icon (xem grid ở trên).' },
            { name: 'size', type: 'number', def: '18', desc: 'Cạnh vuông px (viewBox 24).' },
          ]}
        />
      </Doc>
    </div>
  );
}
