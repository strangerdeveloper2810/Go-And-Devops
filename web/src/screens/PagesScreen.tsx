import { styled } from '@mui/material/styles';
import {
  EmptyState,
  Icon,
  PageHeader,
  PageProse,
  PageTOC,
  PageTreeItem,
  SpaceCard,
  Spinner,
  type TOCItem,
  Text,
  TwoPane,
  VersionBadge,
} from '@pm-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState } from 'react';
import { pagesApi, usePage, useSpaces } from '../features/pages';
import type { Page } from '../features/pages';

// PagesScreen — màn Confluence-style: cột trái (space + cây trang), cột phải (viewer trang).
// Container app: có workspaceId → data thật (useSpaces + usePage); không có → demo presentational.

// ── View-model & cây trang ───────────────────────────────────────────────
// SpaceVM: thu gọn Space (backend snake_case) về đúng props SpaceCard cần.
interface SpaceVM {
  id: number;
  name: string;
  key: string;
  pageCount?: number;
}
// Node cây trang lồng nhau (build từ list phẳng theo parent_id).
interface PageNode {
  id: number;
  title: string;
  parent_id: number | null;
  children: PageNode[];
}

// Build cây từ list phẳng: parent_id không tồn tại trong tập hiện tại → coi là root.
const buildTree = (
  pages: ReadonlyArray<{ id: number; title: string; parent_id: number | null }>,
): PageNode[] => {
  const nodes: PageNode[] = pages.map((p) => ({
    id: p.id,
    title: p.title,
    parent_id: p.parent_id,
    children: [],
  }));
  const byId = new Map<number, PageNode>(nodes.map((n) => [n.id, n]));
  const roots: PageNode[] = [];
  for (const n of nodes) {
    const parent = n.parent_id != null ? byId.get(n.parent_id) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

// Rút mục lục từ HTML + gắn id vào từng heading (h2/h3) để TOC cuộn tới được.
// (DOMPurify của PageProse giữ nguyên thuộc tính id nên anchor vẫn hoạt động.)
const buildToc = (html: string): { html: string; items: TOCItem[] } => {
  if (!html || typeof window === 'undefined' || !window.DOMParser) {
    return { html, items: [] };
  }
  const doc = new window.DOMParser().parseFromString(html, 'text/html');
  const heads = Array.from(doc.querySelectorAll('h2, h3'));
  const items: TOCItem[] = [];
  const used = new Set<string>();
  heads.forEach((h, i) => {
    const title = h.textContent?.trim() ?? '';
    let id = h.id || slugify(title) || `heading-${i}`;
    while (used.has(id)) id = `${id}-${i}`;
    used.add(id);
    h.id = id;
    items.push({ id, title, level: h.tagName === 'H2' ? 1 : 2 });
  });
  return { html: doc.body.innerHTML, items };
};

const formatUpdated = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `Cập nhật ${d.toLocaleDateString('vi-VN')}`;
};

// ── State UI dùng chung (demo + live) ────────────────────────────────────
// Giữ space đang chọn, page đang chọn, tập node đang mở của cây.
const usePagesUi = (spaces: SpaceVM[]) => {
  const [pickedSpaceId, setPickedSpaceId] = useState<number | undefined>(undefined);
  const [selectedPageId, setSelectedPageId] = useState<number | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  // Mặc định chọn space đầu tiên khi chưa chọn tay (derive, không cần effect).
  const activeSpaceId = pickedSpaceId ?? spaces[0]?.id;

  const selectSpace = (id: number) => {
    setPickedSpaceId(id);
    setSelectedPageId(undefined); // đổi space → bỏ chọn page, reset cây
    setExpanded(new Set());
  };
  const selectPage = (id: number) => setSelectedPageId(id);
  const togglePage = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return { activeSpaceId, selectedPageId, expanded, selectSpace, selectPage, togglePage };
};

// ── Presentational: cây trang (đệ quy theo depth) ─────────────────────────
interface TreeCtx {
  expanded: Set<number>;
  activePageId?: number;
  onSelectPage: (id: number) => void;
  onTogglePage: (id: number) => void;
}
const renderTree = (nodes: PageNode[], depth: number, ctx: TreeCtx): ReactNode[] =>
  nodes.flatMap((node) => {
    const hasChildren = node.children.length > 0;
    const isOpen = ctx.expanded.has(node.id);
    const row = (
      <PageTreeItem
        key={node.id}
        title={node.title}
        depth={depth}
        hasChildren={hasChildren}
        expanded={isOpen}
        active={node.id === ctx.activePageId}
        onToggle={() => ctx.onTogglePage(node.id)}
        onClick={() => ctx.onSelectPage(node.id)}
      />
    );
    return hasChildren && isOpen ? [row, ...renderTree(node.children, depth + 1, ctx)] : [row];
  });

// ── Layout styles ─────────────────────────────────────────────────────────
const Aside = styled('div')({ display: 'flex', flexDirection: 'column', gap: 20 });
const Group = styled('div')({ display: 'flex', flexDirection: 'column', gap: 10 });
const SpaceList = styled('div')({ display: 'flex', flexDirection: 'column', gap: 8 });
const Tree = styled('div')({ display: 'flex', flexDirection: 'column', gap: 1 });
const Center = styled('div')({ display: 'flex', justifyContent: 'center', padding: 16 });
const Main = styled('div')({ minWidth: 0 });
const TopMeta = styled('div')({ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 });
// Vùng đọc: 1 cột, thêm rail TOC 180px bên phải khi trang có heading.
const Reader = styled('div', { shouldForwardProp: (p) => p !== 'hasToc' })<{ hasToc?: boolean }>(
  ({ hasToc }) => ({
    display: 'grid',
    gridTemplateColumns: hasToc ? 'minmax(0, 1fr) 180px' : 'minmax(0, 1fr)',
    gap: 28,
    alignItems: 'start',
  }),
);
const TocRail = styled('aside')({ position: 'sticky', top: 16, alignSelf: 'start' });

// ── Presentational: toàn màn (thuần props, không network) ─────────────────
interface PagesViewProps {
  spaces: SpaceVM[];
  spacesLoading?: boolean;
  activeSpaceId?: number;
  onSelectSpace: (id: number) => void;
  tree: PageNode[];
  treeLoading?: boolean;
  activePageId?: number;
  onSelectPage: (id: number) => void;
  expanded: Set<number>;
  onTogglePage: (id: number) => void;
  page?: Page | null;
  pageLoading?: boolean;
}

const PagesView = ({
  spaces,
  spacesLoading,
  activeSpaceId,
  onSelectSpace,
  tree,
  treeLoading,
  activePageId,
  onSelectPage,
  expanded,
  onTogglePage,
  page,
  pageLoading,
}: PagesViewProps) => {
  // Sanitize xảy ra trong PageProse; ở đây chỉ gắn id heading + rút TOC.
  const { html, items: toc } = useMemo(
    () => buildToc(page?.content_html ?? ''),
    [page?.content_html],
  );
  const [activeToc, setActiveToc] = useState<string | undefined>(undefined);
  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  const onSelectToc = (id: string) => {
    setActiveToc(id);
    if (typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <TwoPane asideWidth={288}>
      {/* TRÁI: danh sách space + cây trang của space đang chọn */}
      <Aside>
        <Group>
          <Text variant="caption">Spaces</Text>
          {spacesLoading ? (
            <Center>
              <Spinner />
            </Center>
          ) : spaces.length ? (
            <SpaceList>
              {spaces.map((s) => (
                <SpaceCard
                  key={s.id}
                  name={s.name}
                  spaceKey={s.key}
                  pageCount={s.pageCount}
                  active={s.id === activeSpaceId}
                  onClick={() => onSelectSpace(s.id)}
                />
              ))}
            </SpaceList>
          ) : (
            <Text variant="muted">Chưa có space nào.</Text>
          )}
        </Group>

        <Group>
          <Text variant="caption">Pages</Text>
          {treeLoading ? (
            <Center>
              <Spinner />
            </Center>
          ) : tree.length ? (
            <Tree>
              {renderTree(tree, 0, { expanded, activePageId, onSelectPage, onTogglePage })}
            </Tree>
          ) : (
            <Text variant="muted">Space này chưa có trang.</Text>
          )}
        </Group>
      </Aside>

      {/* PHẢI: viewer trang (header + prose + TOC) hoặc EmptyState khi chưa chọn */}
      <Main>
        {page ? (
          <Reader hasToc={toc.length > 0}>
            <div>
              <TopMeta>
                <VersionBadge version={page.version} />
              </TopMeta>
              <PageHeader
                title={page.title}
                space={activeSpace?.name}
                updatedLabel={formatUpdated(page.updated_at)}
              />
              <PageProse html={html} />
            </div>
            {toc.length ? (
              <TocRail>
                <PageTOC items={toc} activeId={activeToc} onSelect={onSelectToc} />
              </TocRail>
            ) : null}
          </Reader>
        ) : pageLoading ? (
          <Center style={{ paddingTop: 80 }}>
            <Spinner size={22} />
          </Center>
        ) : (
          <EmptyState
            icon={<Icon name="doc" size={24} />}
            title="Chưa chọn trang"
            description="Chọn một trang ở cây bên trái để xem nội dung."
          />
        )}
      </Main>
    </TwoPane>
  );
};

// ── Container LIVE (có workspaceId) ───────────────────────────────────────
const LivePages = ({ workspaceId }: { workspaceId: number }) => {
  const spacesQ = useSpaces(workspaceId);
  const spaces: SpaceVM[] = (spacesQ.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    key: s.key,
  }));
  const ui = usePagesUi(spaces);

  // Không có hook riêng cho "pages theo space" → gọi thẳng pagesApi.listPages.
  const pagesQ = useQuery({
    queryKey: ['spaces', ui.activeSpaceId, 'pages'],
    queryFn: () => pagesApi.listPages(ui.activeSpaceId!),
    enabled: ui.activeSpaceId != null && Number.isFinite(ui.activeSpaceId),
  });
  const tree = useMemo(() => buildTree(pagesQ.data ?? []), [pagesQ.data]);

  // Nội dung trang đang chọn: usePage (disabled khi chưa chọn → NaN).
  const pageQ = usePage(ui.selectedPageId ?? Number.NaN);

  return (
    <PagesView
      spaces={spaces}
      spacesLoading={spacesQ.isLoading}
      activeSpaceId={ui.activeSpaceId}
      onSelectSpace={ui.selectSpace}
      tree={tree}
      treeLoading={pagesQ.isLoading}
      activePageId={ui.selectedPageId}
      onSelectPage={ui.selectPage}
      expanded={ui.expanded}
      onTogglePage={ui.togglePage}
      page={pageQ.data ?? null}
      pageLoading={pageQ.isFetching}
    />
  );
};

// ── Container DEMO (không có workspaceId) ─────────────────────────────────
const DEMO_SPACES: SpaceVM[] = [
  { id: 1, name: 'Engineering', key: 'ENG', pageCount: 3 },
  { id: 2, name: 'Product Design', key: 'DESIGN', pageCount: 2 },
];

const demoPage = (
  id: number,
  space_id: number,
  parent_id: number | null,
  title: string,
  content_html: string,
): Page => ({
  id,
  space_id,
  parent_id,
  title,
  slug: slugify(title),
  content_html,
  content_text: '',
  author_id: 1,
  version: id % 3 === 0 ? 3 : 1,
  created_at: '2026-07-01T09:00:00Z',
  updated_at: '2026-07-08T14:30:00Z',
});

const DEMO_PAGES: Page[] = [
  demoPage(
    11,
    1,
    null,
    'Getting Started',
    '<h2>Chào mừng</h2><p>Tài liệu này giúp bạn khởi động nhanh với <strong>PM Platform</strong>.</p><ul><li>Cài đặt môi trường</li><li>Chạy hạ tầng dev</li><li>Build service đầu tiên</li></ul><h2>Yêu cầu</h2><p>Cần Go 1.22+, Docker (OrbStack) và Node cho FE.</p><pre><code>docker compose -f infra/dev/docker-compose.yml up -d</code></pre>',
  ),
  demoPage(
    12,
    1,
    11,
    'Local Setup',
    '<h2>Clone &amp; build</h2><p>Mỗi service là một Go module riêng, build ở module-mode như CI.</p><pre><code>GOWORK=off go -C services/workspace build ./...</code></pre><h2>Biến môi trường</h2><ul><li><code>PM_WORKSPACE_DATABASE_URL</code></li><li><code>PM_WORKSPACE_KAFKA_BROKERS</code></li></ul>',
  ),
  demoPage(
    13,
    1,
    null,
    'Architecture Overview',
    '<h2>Microservices</h2><p>FE gọi REST qua api-gateway; gateway verify JWT rồi inject header danh tính.</p><ul><li>auth · workspace · issue · page · file</li><li>1 Postgres, mỗi service 1 schema riêng</li></ul><h2>Event-driven</h2><p>Loose coupling qua Kafka <code>EventEnvelope</code>; authz build từ local projection.</p><pre><code>topic: workspace.events\nacks: RequireAll</code></pre>',
  ),
  demoPage(
    21,
    2,
    null,
    'Design Principles',
    '<h2>Nguyên tắc</h2><p>Giao diện "console": tối giản, tương phản tốt cả light lẫn dark qua CSS var.</p><ul><li>Rõ ràng hơn hoa mỹ</li><li>Nhất quán token màu/khoảng cách</li><li>Accessible mặc định</li></ul><h2>Tông màu</h2><p>Accent lime, surface xám nhiều lớp.</p>',
  ),
  demoPage(
    22,
    2,
    21,
    'Color & Type',
    '<h2>Màu</h2><p>Toàn bộ màu là CSS variable để đổi theme không cần rebuild.</p><pre><code>--accent · --surface-1 · --text-hi</code></pre><h2>Typography</h2><ul><li>Sans cho nội dung</li><li>Mono cho code &amp; key</li></ul>',
  ),
];

const DemoPages = () => {
  const ui = usePagesUi(DEMO_SPACES);
  const tree = useMemo(
    () => buildTree(DEMO_PAGES.filter((p) => p.space_id === ui.activeSpaceId)),
    [ui.activeSpaceId],
  );
  const page = DEMO_PAGES.find((p) => p.id === ui.selectedPageId) ?? null;

  return (
    <PagesView
      spaces={DEMO_SPACES}
      activeSpaceId={ui.activeSpaceId}
      onSelectSpace={ui.selectSpace}
      tree={tree}
      activePageId={ui.selectedPageId}
      onSelectPage={ui.selectPage}
      expanded={ui.expanded}
      onTogglePage={ui.togglePage}
      page={page}
    />
  );
};

// ── Entry: chọn container theo workspaceId ────────────────────────────────
export const PagesScreen = ({ workspaceId }: { workspaceId?: number }) => {
  if (typeof workspaceId === 'number' && Number.isFinite(workspaceId)) {
    return <LivePages workspaceId={workspaceId} />;
  }
  return <DemoPages />;
};
