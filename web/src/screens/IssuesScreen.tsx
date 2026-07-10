import { styled } from '@mui/material/styles';
import {
  Button,
  EmptyState,
  IssueDetailPanel,
  IssueRow,
  Spinner,
  Surface,
  TwoPane,
  WorkflowBar,
} from '@pm-platform/ui';
import { useState } from 'react';
import type { Issue } from '../features/issues';
import { useProjectIssues, useTransitionIssue } from '../features/issues';

// Các trạng thái workflow issue-service (khớp StatusPill MAP của design system).
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];

// ── Demo assignee: map id → tên hiển thị (fallback "User N") ──────────────────
const DEMO_NAMES: Record<number, string> = {
  1: 'Ada Lovelace',
  2: 'Leo Turing',
  3: 'Grace Hopper',
  4: 'Alan Kay',
};
const assigneeName = (id: number | null): string | undefined =>
  id == null ? undefined : (DEMO_NAMES[id] ?? `User ${id}`);

// ── Demo issues: đủ trạng thái để render không cần backend ────────────────────
// Factory điền default cho các field không quan tâm (Issue là camelCase từ issue-service Java).
const demoIssue = (
  over: Partial<Issue> & Pick<Issue, 'id' | 'key' | 'summary' | 'status' | 'priority'>,
): Issue => ({
  projectId: 0,
  typeId: 1,
  description: null,
  assigneeId: null,
  reporterId: null,
  parentId: null,
  sprintId: null,
  storyPoints: null,
  labels: [],
  dueDate: null,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...over,
});

const DEMO_ISSUES: Issue[] = [
  demoIssue({
    id: 1,
    key: 'APOLLO-12',
    summary: 'JWT auth middleware chặn request chưa verify',
    status: 'todo',
    priority: 'high',
    labels: ['auth', 'gateway'],
    assigneeId: 1,
    description: 'Gateway verify token qua auth gRPC rồi inject X-User-ID trước khi proxy.',
  }),
  demoIssue({
    id: 2,
    key: 'APOLLO-9',
    summary: 'Kéo-thả card giữa các cột board',
    status: 'in_progress',
    priority: 'medium',
    labels: ['board', 'ux'],
    assigneeId: 3,
  }),
  demoIssue({
    id: 3,
    key: 'APOLLO-7',
    summary: 'Kafka consumer idempotent cho projection',
    status: 'in_progress',
    priority: 'highest',
    labels: ['kafka'],
    assigneeId: 1,
    description: 'Handler phải upsert để commit thủ công at-least-once không nhân đôi state.',
  }),
  demoIssue({
    id: 4,
    key: 'APOLLO-5',
    summary: 'Editor trang wiki + sanitize HTML',
    status: 'in_review',
    priority: 'medium',
    labels: ['page'],
    assigneeId: 2,
  }),
  demoIssue({
    id: 5,
    key: 'APOLLO-3',
    summary: 'Màn đăng nhập + lưu token',
    status: 'done',
    priority: 'low',
    assigneeId: 3,
  }),
  demoIssue({
    id: 6,
    key: 'APOLLO-2',
    summary: 'Upload file qua MinIO (giới hạn size)',
    status: 'done',
    priority: 'medium',
    labels: ['file'],
    assigneeId: 4,
  }),
];

// ── Layout glue (styled + CSS var) ────────────────────────────────────────────
const Head = styled('div')({ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 });
const H = styled('h1')({
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-hi)',
});
const Sub = styled('span')({ fontSize: 13, color: 'var(--text-lo)' });
// List card: bọc các IssueRow lại thành 1 khối bo góc, cắt viền dòng cuối.
const ListCard = styled(Surface)({ overflow: 'hidden' });
const Detail = styled('div')({ display: 'flex', flexDirection: 'column', gap: 14 });
const WorkflowRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});
const WorkflowLabel = styled('span')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
});
const Pending = styled('span')({ fontSize: 12, color: 'var(--text-lo)' });
const Loading = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '56px 0',
  color: 'var(--text-lo)',
  fontSize: 13,
});

// Container màn Issues: list-view + detail panel. Có projectId → live (useProjectIssues),
// không có → demo fallback render offline. Bấm status ở WorkflowBar → transition (live) hoặc
// đổi state cục bộ (demo).
export const IssuesScreen = ({ projectId }: { projectId?: number }) => {
  const isLive = typeof projectId === 'number' && Number.isFinite(projectId);

  // Hook luôn được gọi (React rules-of-hooks). Demo mode: enabled=false vì NaN → không fetch.
  const query = useProjectIssues(projectId ?? Number.NaN);

  // Demo mode giữ issues ở state để transition đổi được trạng thái ngay tại chỗ.
  const [demoIssues, setDemoIssues] = useState<Issue[]>(DEMO_ISSUES);
  const issues: Issue[] = isLive ? (query.data ?? []) : demoIssues;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = issues.find((i) => i.key === selectedKey) ?? null;

  // Mutation gắn theo key issue đang chọn (re-create khi đổi selection → luôn đúng key).
  const transition = useTransitionIssue(selected?.key ?? '');

  const handleTransition = (status: string) => {
    if (!selected || status === selected.status) return;
    if (isLive) {
      transition.mutate(status);
    } else {
      setDemoIssues((prev) => prev.map((i) => (i.key === selected.key ? { ...i, status } : i)));
    }
  };

  const header = (
    <Head>
      <H>Issues</H>
      <Sub>
        {issues.length} issues{isLive ? '' : ' · demo'}
      </Sub>
    </Head>
  );

  // Loading chỉ khi live (demo có data sẵn).
  if (isLive && query.isLoading) {
    return (
      <div>
        {header}
        <Loading>
          <Spinner size={18} />
          Đang tải issues…
        </Loading>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          title="Chưa có issue nào"
          description="Project này chưa có issue. Tạo issue đầu tiên để bắt đầu theo dõi công việc."
          action={<Button variant="primary">Tạo issue</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      {header}
      <TwoPane asideWidth={440}>
        {/* Trái: danh sách issue (fixed width) */}
        <ListCard>
          {issues.map((i) => (
            <IssueRow
              key={i.key}
              issueKey={i.key}
              summary={i.summary}
              status={i.status}
              priority={i.priority}
              assigneeName={assigneeName(i.assigneeId)}
              labels={i.labels}
              onClick={() => setSelectedKey(i.key)}
            />
          ))}
        </ListCard>

        {/* Phải: chi tiết + workflow (hoặc gợi ý chọn issue) */}
        {selected ? (
          <Detail>
            <WorkflowRow>
              <WorkflowLabel>Status</WorkflowLabel>
              <WorkflowBar
                statuses={STATUSES}
                current={selected.status}
                onSelect={handleTransition}
              />
              {isLive && transition.isPending ? <Pending>đang chuyển…</Pending> : null}
            </WorkflowRow>
            <IssueDetailPanel
              issueKey={selected.key}
              summary={selected.summary}
              description={selected.description ?? undefined}
              status={selected.status}
              priority={selected.priority}
              assigneeName={assigneeName(selected.assigneeId)}
              labels={selected.labels}
            />
          </Detail>
        ) : (
          <EmptyState
            title="Chọn một issue"
            description="Bấm vào một dòng bên trái để xem chi tiết và chuyển trạng thái workflow."
          />
        )}
      </TwoPane>
    </div>
  );
};
