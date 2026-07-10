import {
  CommentItem,
  PageHeader,
  PageProse,
  PageTOC,
  PageTreeItem,
  SpaceCard,
  type TOCItem,
  VersionBadge,
} from '@pm-platform/ui';
import { useState } from 'react';
import {
  Doc,
  Grid,
  GroupLabel,
  PropsTable,
  Row,
  SectionLead,
  SectionTitle,
  Specimen,
} from '../kit';

// ─── Demo data (chỉ dùng trong doc) ───────────────────────────────────────────
const spaces = [
  { name: 'Engineering', spaceKey: 'ENG', pageCount: 128 },
  { name: 'Design System', spaceKey: 'DESIGN', pageCount: 42 },
  { name: 'Product', spaceKey: 'PROD', pageCount: 76 },
  { name: 'People Ops', spaceKey: 'HR', pageCount: 19 },
];

// Cây trang phẳng hoá: mỗi node biết depth + có con hay không (caller tự dựng).
const tree: {
  title: string;
  depth: number;
  hasChildren?: boolean;
  expanded?: boolean;
  active?: boolean;
}[] = [
  { title: 'Kiến trúc nền tảng', depth: 0, hasChildren: true, expanded: true },
  { title: 'Microservices overview', depth: 1, hasChildren: false, active: true },
  { title: 'Event-driven & Kafka', depth: 1, hasChildren: true, expanded: false },
  { title: 'Runbooks', depth: 0, hasChildren: true, expanded: true },
  { title: 'Sự cố Postgres 2026-06', depth: 1, hasChildren: false },
  { title: 'Onboarding checklist', depth: 0, hasChildren: false },
];

const toc: TOCItem[] = [
  { id: 'intro', title: 'Giới thiệu', level: 1 },
  { id: 'arch', title: 'Kiến trúc', level: 1 },
  { id: 'services', title: 'Danh sách service', level: 2 },
  { id: 'ports', title: 'Sơ đồ cổng', level: 3 },
  { id: 'events', title: 'Luồng sự kiện', level: 2 },
  { id: 'faq', title: 'FAQ', level: 1 },
];

const comments = [
  {
    author: 'An Nguyen',
    timeLabel: '2 giờ trước',
    body: 'Phần "Sơ đồ cổng" nên nhắc rõ hạ tầng docker để ở dải 91xx để tránh đụng gRPC service.',
  },
  {
    author: 'Binh Tran',
    timeLabel: 'Hôm qua',
    body: 'Đã cập nhật sơ đồ, thêm cảnh báo MinIO 9000/9001 từng đụng gateway/auth. Cảm ơn nhé!',
  },
];

// HTML mẫu cho PageProse — sẽ được DOMPurify.sanitize trước khi render.
const proseHtml = `
  <h1>Thiết kế PM Platform</h1>
  <p>Nền tảng thay thế <strong>Jira + Confluence</strong> nội bộ, kiến trúc
  <em>microservices, event-driven</em>. Mỗi service sở hữu một schema Postgres riêng.</p>
  <h2>Nguyên tắc</h2>
  <ul>
    <li>Không service nào query <code>cross-schema</code>.</li>
    <li>Cần data service khác → gRPC (đồng bộ) hoặc projection từ Kafka (bất đồng bộ).</li>
    <li>Gateway verify JWT rồi set header <code>X-User-ID</code>.</li>
  </ul>
  <h3>Ví dụ producer</h3>
  <pre><code>writer := &kafka.Writer{ RequiredAcks: kafka.RequireAll }</code></pre>
  <blockquote>Struct-literal mặc định RequireNone (acks=0) → mất event âm thầm.</blockquote>
  <p>Xem thêm tại <a href="#">tài liệu kiến trúc</a>.</p>
`;

export default function PageSection() {
  const [activeSpace, setActiveSpace] = useState('DESIGN');
  const [activeToc, setActiveToc] = useState('arch');

  return (
    <div>
      <SectionTitle>Page module</SectionTitle>
      <SectionLead>
        Các organism cho phần Confluence-core: thẻ space, cây trang, header &amp; nội dung "prose"
        (sanitize chống XSS), mục lục, bình luận và nhãn phiên bản. Tất cả presentational — caller
        truyền dữ liệu đã render/serialize sẵn.
      </SectionLead>

      {/* ── SpaceCard ── */}
      <Doc
        name="SpaceCard"
        tagline="Thẻ một space (không gian tài liệu): key kiểu mono, tên, số trang. Bật active để viền accent + nền nổi — dùng cho space đang chọn."
      >
        <GroupLabel>Lưới space (thẻ thứ 2 đang active — bấm để đổi)</GroupLabel>
        <Specimen>
          <Grid min={190} style={{ width: '100%' }}>
            {spaces.map((s) => (
              <SpaceCard
                key={s.spaceKey}
                {...s}
                active={s.spaceKey === activeSpace}
                onClick={() => setActiveSpace(s.spaceKey)}
              />
            ))}
          </Grid>
        </Specimen>
        <GroupLabel>Không có pageCount</GroupLabel>
        <Specimen>
          <div style={{ width: 200 }}>
            <SpaceCard name="Sandbox" spaceKey="SBX" />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên space (cắt ellipsis 1 dòng).' },
            { name: 'spaceKey', type: 'string', desc: 'Key ngắn kiểu Jira, vd ENG, DESIGN.' },
            { name: 'pageCount', type: 'number', def: '—', desc: 'Có → hiển thị "{n} pages".' },
            { name: 'active', type: 'boolean', def: 'false', desc: 'Viền accent + nền surface-3.' },
            { name: 'onClick', type: '() => void', def: '—', desc: 'Bấm vào thẻ.' },
          ]}
        />
      </Doc>

      {/* ── PageTreeItem ── */}
      <Doc
        name="PageTreeItem"
        tagline="Một dòng trong cây trang. Indent theo depth; chevron xoay khi expanded và có onToggle riêng (không lan ra onClick). Ghép nhiều dòng thành cây điều hướng."
      >
        <GroupLabel>Cây trang (depth 0–1, một dòng active)</GroupLabel>
        <Specimen>
          <div style={{ width: '100%', maxWidth: 320 }}>
            {tree.map((n) => (
              <PageTreeItem
                key={n.title}
                title={n.title}
                depth={n.depth}
                hasChildren={n.hasChildren}
                expanded={n.expanded}
                active={n.active}
                onClick={() => undefined}
                onToggle={() => undefined}
              />
            ))}
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'title', type: 'string', desc: 'Tiêu đề trang (ellipsis 1 dòng).' },
            { name: 'depth', type: 'number', def: '0', desc: 'Độ sâu → indent 16px mỗi cấp.' },
            {
              name: 'active',
              type: 'boolean',
              def: 'false',
              desc: 'Dòng đang mở — nền surface-2.',
            },
            {
              name: 'hasChildren',
              type: 'boolean',
              def: 'false',
              desc: 'Có → hiện chevron; không → spacer canh lề.',
            },
            { name: 'expanded', type: 'boolean', def: 'false', desc: 'Xoay chevron (mở/đóng).' },
            {
              name: 'onToggle',
              type: '() => void',
              def: '—',
              desc: 'Bấm chevron (stopPropagation, không gọi onClick).',
            },
            { name: 'onClick', type: '() => void', def: '—', desc: 'Bấm cả dòng.' },
          ]}
        />
      </Doc>

      {/* ── PageHeader ── */}
      <Doc
        name="PageHeader"
        tagline="Header trên cùng của trang wiki: breadcrumb space (kèm icon), tiêu đề H1, và dòng meta cập nhật. Có hairline ngăn với phần nội dung."
      >
        <GroupLabel>Đầy đủ (breadcrumb + meta)</GroupLabel>
        <Specimen>
          <div style={{ width: '100%' }}>
            <PageHeader
              title="Thiết kế PM Platform"
              space="Engineering"
              updatedLabel="Cập nhật 2 giờ trước bởi An Nguyen"
            />
          </div>
        </Specimen>
        <GroupLabel>Chỉ tiêu đề</GroupLabel>
        <Specimen>
          <div style={{ width: '100%' }}>
            <PageHeader title="Trang mới chưa có metadata" />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'title', type: 'string', desc: 'Tiêu đề trang (Text variant h1).' },
            { name: 'space', type: 'string', def: '—', desc: 'Có → breadcrumb với icon doc.' },
            { name: 'updatedLabel', type: 'string', def: '—', desc: 'Dòng meta "Cập nhật …".' },
          ]}
        />
      </Doc>

      {/* ── PageProse ── */}
      <Doc
        name="PageProse"
        tagline="Vùng nội dung wiki đã render sẵn HTML. BẮT BUỘC sanitize bằng DOMPurify trước dangerouslySetInnerHTML (chống XSS kiểu Confluence). Typography (h1–h3, list, code, pre, blockquote, link…) đọc đẹp cả light/dark qua CSS var."
      >
        <Specimen>
          <div style={{ width: '100%', maxWidth: 720 }}>
            <PageProse html={proseHtml} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'html',
              type: 'string',
              desc: 'HTML đã render từ backend; được DOMPurify.sanitize trước khi gắn vào DOM.',
            },
          ]}
        />
      </Doc>

      {/* ── PageTOC ── */}
      <Doc
        name="PageTOC"
        tagline="Mục lục cạnh nội dung — link cuộn tới heading, indent theo level (1–3). Mục active có viền trái accent. Demo dưới có state thật."
      >
        <GroupLabel>Tương tác (bấm để đổi active)</GroupLabel>
        <Specimen label={`activeId = "${activeToc}"`}>
          <div style={{ width: '100%', maxWidth: 260 }}>
            <PageTOC items={toc} activeId={activeToc} onSelect={setActiveToc} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'items',
              type: 'TOCItem[]',
              desc: '{ id, title, level } — level 1..3 quyết định indent (14px/cấp).',
            },
            { name: 'activeId', type: 'string', def: '—', desc: 'id mục đang xem — viền accent.' },
            {
              name: 'onSelect',
              type: '(id: string) => void',
              def: '—',
              desc: 'Callback khi bấm 1 mục.',
            },
          ]}
        />
      </Doc>

      {/* ── CommentItem ── */}
      <Doc
        name="CommentItem"
        tagline="Một bình luận: Avatar chữ cái đầu + tên + thời gian + nội dung. Xếp chồng nhiều cái thành luồng thảo luận dưới trang."
      >
        <GroupLabel>Luồng bình luận</GroupLabel>
        <Specimen>
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {comments.map((c) => (
              <CommentItem key={c.author} {...c} />
            ))}
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'author', type: 'string', desc: 'Tên người bình luận (suy Avatar).' },
            { name: 'timeLabel', type: 'string', desc: 'Nhãn thời gian, vd "2 giờ trước".' },
            { name: 'body', type: 'string', desc: 'Nội dung bình luận (plain text).' },
          ]}
        />
      </Doc>

      {/* ── VersionBadge ── */}
      <Doc
        name="VersionBadge"
        tagline="Nhãn phiên bản trang (Confluence versioning) — kế thừa Tag tone neutral, đổi sang font mono, hiển thị 'v{n}'."
      >
        <Specimen label="version = 1 | 4 | 12 | 128">
          <Row>
            <VersionBadge version={1} />
            <VersionBadge version={4} />
            <VersionBadge version={12} />
            <VersionBadge version={128} />
          </Row>
        </Specimen>
        <PropsTable
          rows={[{ name: 'version', type: 'number', desc: 'Số phiên bản → hiển thị "v{n}".' }]}
        />
      </Doc>
    </div>
  );
}
