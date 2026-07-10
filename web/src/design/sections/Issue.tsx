import {
  type BoardColumn,
  IssueBoard,
  IssueCard,
  type IssueCardData,
  IssueColumn,
  IssueDetailPanel,
  IssueRow,
  LabelChip,
  type Priority,
  PriorityBadge,
  StatusPill,
  WorkflowBar,
} from '@pm-platform/ui';
import { useState } from 'react';
import { Doc, Grid, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

// ─── Demo data (chỉ dùng trong doc, không dính backend) ───────────────────────
const priorities: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest'];

const cards: IssueCardData[] = [
  {
    id: 1,
    issueKey: 'APOLLO-12',
    summary: 'Thiết kế lại luồng onboarding cho người dùng mới',
    priority: 'high',
    labels: ['ux', 'growth'],
    assigneeName: 'An Nguyen',
  },
  {
    id: 2,
    issueKey: 'APOLLO-31',
    summary: 'Rate-limit endpoint /login chống brute-force',
    priority: 'highest',
    labels: ['security'],
    assigneeName: 'Binh Tran',
  },
  {
    id: 3,
    issueKey: 'APOLLO-44',
    summary: 'Cache projection membership để giảm query',
    priority: 'medium',
    labels: ['perf', 'backend'],
    assigneeName: 'Chi Le',
  },
];

const boardColumns: BoardColumn[] = [
  { key: 'todo', label: 'To Do', color: 'var(--text-lo)', items: [cards[0]] },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)', items: [cards[1], cards[2]] },
  {
    key: 'in_review',
    label: 'In Review',
    color: 'var(--violet)',
    items: [
      {
        id: 4,
        issueKey: 'APOLLO-08',
        summary: 'Chuẩn hoá EventEnvelope cho workspace.events',
        priority: 'low',
        labels: ['kafka'],
        assigneeName: 'Dung Pham',
      },
    ],
  },
  {
    key: 'done',
    label: 'Done',
    color: 'var(--green)',
    items: [
      {
        id: 5,
        issueKey: 'APOLLO-02',
        summary: 'Bootstrap gateway JWT middleware',
        priority: 'medium',
        assigneeName: 'An Nguyen',
      },
    ],
  },
];

const rows = [
  {
    issueKey: 'APOLLO-12',
    summary: 'Thiết kế lại luồng onboarding cho người dùng mới',
    status: 'in_progress',
    priority: 'high' as Priority,
    assigneeName: 'An Nguyen',
    labels: ['ux', 'growth'],
  },
  {
    issueKey: 'APOLLO-31',
    summary: 'Rate-limit endpoint /login chống brute-force',
    status: 'todo',
    priority: 'highest' as Priority,
    assigneeName: 'Binh Tran',
    labels: ['security'],
  },
  {
    issueKey: 'APOLLO-08',
    summary: 'Chuẩn hoá EventEnvelope cho workspace.events',
    status: 'in_review',
    priority: 'low' as Priority,
    assigneeName: 'Dung Pham',
  },
  {
    issueKey: 'APOLLO-02',
    summary: 'Bootstrap gateway JWT middleware',
    status: 'done',
    priority: 'medium' as Priority,
  },
];

const workflow = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

// Bọc để danh sách IssueRow có bo góc + không lòi hairline dòng cuối.
const rowListSx = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  overflow: 'hidden',
} as const;

export default function IssueSection() {
  const [current, setCurrent] = useState('In Progress');

  return (
    <div>
      <SectionTitle>Issue module</SectionTitle>
      <SectionLead>
        Các organism cho phần Jira-core: hiển thị trạng thái/độ ưu tiên, thẻ &amp; board Kanban,
        dòng list-view, thanh chuyển workflow và panel chi tiết. Tất cả đều presentational — caller
        truyền dữ liệu đã map sẵn, không component nào tự fetch.
      </SectionLead>

      {/* ── StatusPill ── */}
      <Doc
        name="StatusPill"
        tagline="Nhãn trạng thái workflow. Map các status chuẩn (todo / in_progress / in_review / done) sang tone màu; status lạ → tone neutral, giữ nguyên chữ."
      >
        <GroupLabel>Các trạng thái chuẩn</GroupLabel>
        <Specimen label='status="todo" | "in_progress" | "in_review" | "done"'>
          <StatusPill status="todo" />
          <StatusPill status="in_progress" />
          <StatusPill status="in_review" />
          <StatusPill status="done" />
        </Specimen>
        <GroupLabel>Fallback (status không có trong map)</GroupLabel>
        <Specimen label='status="blocked"'>
          <StatusPill status="blocked" />
          <StatusPill status="Custom Flow" />
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'status',
              type: 'string',
              desc: 'Khoá trạng thái (không phân biệt hoa/thường). Không khớp → hiển thị nguyên văn, tone neutral.',
            },
          ]}
        />
      </Doc>

      {/* ── PriorityBadge ── */}
      <Doc
        name="PriorityBadge"
        tagline="Chấm ưu tiên (PriorityDot) kèm nhãn chữ. Màu chấm suy theo priority; ẩn nhãn để dùng trong hàng compact."
      >
        <GroupLabel>Đủ 5 mức (có nhãn)</GroupLabel>
        <Specimen label="showLabel = true (mặc định)">
          {priorities.map((p) => (
            <PriorityBadge key={p} priority={p} />
          ))}
        </Specimen>
        <GroupLabel>Chỉ chấm (dùng trong IssueRow / IssueCard)</GroupLabel>
        <Specimen label="showLabel = false">
          {priorities.map((p) => (
            <PriorityBadge key={p} priority={p} showLabel={false} />
          ))}
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'priority',
              type: 'Priority',
              desc: "'highest' | 'high' | 'medium' | 'low' | 'lowest'.",
            },
            { name: 'showLabel', type: 'boolean', def: 'true', desc: 'Ẩn chữ, chỉ giữ chấm màu.' },
          ]}
        />
      </Doc>

      {/* ── LabelChip ── */}
      <Doc
        name="LabelChip"
        tagline="Nhãn (label) issue tone violet. Truyền onRemove để hiện nút x (dùng ở form gán label); bỏ qua onRemove để hiển thị read-only."
      >
        <GroupLabel>Read-only vs. removable</GroupLabel>
        <Specimen label="onRemove?">
          <LabelChip label="ux" />
          <LabelChip label="security" />
          <LabelChip label="backend" onRemove={() => undefined} />
          <LabelChip label="growth" onRemove={() => undefined} />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'label', type: 'string', desc: 'Chữ hiển thị trên chip.' },
            {
              name: 'onRemove',
              type: '() => void',
              desc: 'Có → render nút x với aria-label "Remove {label}". Không → chip tĩnh.',
            },
          ]}
        />
      </Doc>

      {/* ── IssueRow ── */}
      <Doc
        name="IssueRow"
        tagline="Dòng issue ở list-view (khác IssueCard ở board): 1 hàng ngang compact gồm IssueKey · StatusPill · summary · labels · PriorityBadge · Avatar. Truyền onClick để mở chi tiết."
      >
        <GroupLabel>Danh sách (xếp chồng, hairline ngăn dòng)</GroupLabel>
        <Specimen>
          <div style={rowListSx}>
            {rows.map((r) => (
              <IssueRow key={r.issueKey} {...r} onClick={() => undefined} />
            ))}
          </div>
        </Specimen>
        <GroupLabel>Một dòng không assignee / không label</GroupLabel>
        <Specimen>
          <div style={rowListSx}>
            <IssueRow
              issueKey="APOLLO-77"
              summary="Chưa gán ai, chưa có nhãn — vẫn thẳng hàng"
              status="todo"
              priority="lowest"
            />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'issueKey', type: 'string', desc: 'Mã kiểu Jira, vd APOLLO-12.' },
            { name: 'summary', type: 'string', desc: 'Tiêu đề issue (cắt ellipsis 1 dòng).' },
            { name: 'status', type: 'string', desc: 'Đưa thẳng vào StatusPill.' },
            { name: 'priority', type: 'Priority', desc: 'Hiển thị chấm (showLabel=false).' },
            { name: 'assigneeName', type: 'string', def: '—', desc: 'Có → Avatar chữ cái đầu.' },
            { name: 'labels', type: 'string[]', def: '[]', desc: 'Hiển thị tối đa 2 Tag violet.' },
            { name: 'onClick', type: '() => void', def: '—', desc: 'Có → hàng clickable + hover.' },
          ]}
        />
      </Doc>

      {/* ── IssueCard ── */}
      <Doc
        name="IssueCard"
        tagline="Thẻ issue dùng trên board Kanban (Surface interactive). Nhận nguyên object IssueCardData; hiển thị tối đa 2 label."
      >
        <GroupLabel>Lưới thẻ</GroupLabel>
        <Specimen>
          <Grid min={230} style={{ width: '100%' }}>
            {cards.map((c) => (
              <IssueCard key={c.id} issue={c} onClick={() => undefined} />
            ))}
          </Grid>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'issue',
              type: 'IssueCardData',
              desc: '{ id, issueKey, summary, priority, labels?, assigneeName? }.',
            },
            { name: 'onClick', type: '() => void', def: '—', desc: 'Bấm vào thẻ.' },
          ]}
        />
      </Doc>

      {/* ── IssueColumn ── */}
      <Doc
        name="IssueColumn"
        tagline="Một cột của board: chấm màu + tiêu đề uppercase + Badge đếm. Nhận children (thường là các IssueCard)."
      >
        <Specimen>
          <IssueColumn label="In Progress" color="var(--blue)" count={2}>
            <IssueCard issue={cards[1]} />
            <IssueCard issue={cards[2]} />
          </IssueColumn>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'label', type: 'string', desc: 'Tiêu đề cột (uppercase).' },
            {
              name: 'color',
              type: 'string',
              desc: 'Màu chấm — thường là CSS var, vd var(--blue).',
            },
            {
              name: 'count',
              type: 'number',
              def: '—',
              desc: 'Số hiển thị trong Badge; bỏ qua để ẩn.',
            },
            { name: 'children', type: 'ReactNode', def: '—', desc: 'Nội dung cột (các thẻ).' },
          ]}
        />
      </Doc>

      {/* ── IssueBoard ── */}
      <Doc
        name="IssueBoard"
        tagline="Board Kanban đầy đủ — caller đã gom item theo cột (BoardColumn[]). Cuộn ngang khi tràn; onCardClick nhận đúng issue được bấm."
      >
        <Specimen>
          <div style={{ width: '100%' }}>
            <IssueBoard columns={boardColumns} onCardClick={() => undefined} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'columns',
              type: 'BoardColumn[]',
              desc: '{ key, label, color, items: IssueCardData[] } — count tự suy từ items.length.',
            },
            {
              name: 'onCardClick',
              type: '(issue: IssueCardData) => void',
              def: '—',
              desc: 'Callback khi bấm 1 thẻ bất kỳ.',
            },
          ]}
        />
      </Doc>

      {/* ── WorkflowBar ── */}
      <Doc
        name="WorkflowBar"
        tagline="Thanh segmented để chuyển trạng thái issue. Nút current tô accent; onSelect trả về status được bấm. Demo dưới đây có state thật."
      >
        <GroupLabel>Tương tác (bấm để đổi current)</GroupLabel>
        <Specimen label={`current = "${current}"`}>
          <WorkflowBar statuses={workflow} current={current} onSelect={setCurrent} />
        </Specimen>
        <GroupLabel>Ít bước / read-only (không onSelect)</GroupLabel>
        <Specimen>
          <WorkflowBar statuses={['To Do', 'Doing', 'Done']} current="Doing" />
        </Specimen>
        <PropsTable
          rows={[
            { name: 'statuses', type: 'string[]', desc: 'Danh sách bước workflow theo thứ tự.' },
            { name: 'current', type: 'string', desc: 'Bước đang chọn — tô accent.' },
            {
              name: 'onSelect',
              type: '(status: string) => void',
              def: '—',
              desc: 'Callback khi bấm 1 bước.',
            },
          ]}
        />
      </Doc>

      {/* ── IssueDetailPanel ── */}
      <Doc
        name="IssueDetailPanel"
        tagline="Panel chi tiết 1 issue: header (IssueKey + StatusPill), tiêu đề lớn, mô tả, và lưới meta (priority / assignee / labels). Assignee/labels rỗng → hiển thị placeholder mờ."
      >
        <GroupLabel>Đầy đủ dữ liệu</GroupLabel>
        <Specimen>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <IssueDetailPanel
              issueKey="APOLLO-12"
              summary="Thiết kế lại luồng onboarding cho người dùng mới"
              description="Rút gọn còn 3 bước, thêm progress indicator và cho phép skip. Đo lường tỉ lệ hoàn tất onboarding trước/sau."
              status="in_progress"
              priority="high"
              assigneeName="An Nguyen"
              labels={['ux', 'growth', 'q3']}
            />
          </div>
        </Specimen>
        <GroupLabel>Thiếu mô tả / chưa gán / không label</GroupLabel>
        <Specimen>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <IssueDetailPanel
              issueKey="APOLLO-99"
              summary="Issue tối giản chưa được refine"
              status="todo"
              priority="lowest"
            />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'issueKey', type: 'string', desc: 'Mã kiểu Jira.' },
            { name: 'summary', type: 'string', desc: 'Tiêu đề lớn.' },
            { name: 'description', type: 'string', def: '—', desc: 'Đoạn mô tả; bỏ qua để ẩn.' },
            { name: 'status', type: 'string', desc: 'Đưa vào StatusPill.' },
            { name: 'priority', type: 'Priority', desc: 'Hàng meta Priority.' },
            {
              name: 'assigneeName',
              type: 'string',
              def: '—',
              desc: 'Có → Avatar + tên; không → "Unassigned".',
            },
            { name: 'labels', type: 'string[]', def: '[]', desc: 'Render LabelChip; rỗng → "—".' },
          ]}
        />
      </Doc>
    </div>
  );
}
