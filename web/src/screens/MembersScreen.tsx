import { styled } from '@mui/material/styles';
import {
  Button,
  Callout,
  Divider,
  EmptyState,
  Icon,
  InviteForm,
  MemberAvatarStack,
  type MemberData,
  MemberList,
  PermissionRow,
  Spinner,
  Surface,
  Tabs,
} from '@pm-platform/ui';
import { useMemo, useState } from 'react';
import { useUsersByIds } from '../features/users';
import { useAddMember, useWorkspaceMembers } from '../features/workspaces';

// ── styled (đồng bộ BoardScreen) ────────────────────────────────────────────
const Head = styled('div')({ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 });
const Titles = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2 });
const H = styled('h1')({
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-hi)',
});
const Sub = styled('span')({ fontSize: 13, color: 'var(--text-lo)' });
const Spacer = styled('div')({ flex: 1 });
const Section = styled('section')({ marginTop: 22 });
const SecTitle = styled('h2')({
  margin: '0 0 10px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-hi)',
});
const InviteCard = styled(Surface)({ padding: 16 });
const LoadRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '40px 0',
  justifyContent: 'center',
  color: 'var(--text-lo)',
  fontSize: 13,
});

// Nhãn "tham gia" gọn từ ISO date — đủ cho danh sách, không cần lib relative-time.
const joinedLabel = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Tham gia hôm nay';
  if (days === 1) return 'Tham gia hôm qua';
  if (days < 30) return `Tham gia ${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Tham gia ${months} tháng trước`;
  return `Tham gia ${Math.floor(months / 12)} năm trước`;
};

// Thành viên demo (owner/admin/member/viewer) — render không cần backend.
const DEMO_MEMBERS: MemberData[] = [
  {
    id: 1,
    name: 'Nguyễn Phương Thảo',
    email: 'thao@apollo.dev',
    role: 'owner',
    joinedLabel: 'Tham gia 3 tháng trước',
  },
  {
    id: 2,
    name: 'Trần Văn Minh',
    email: 'minh@apollo.dev',
    role: 'admin',
    joinedLabel: 'Tham gia 6 tuần trước',
  },
  {
    id: 3,
    name: 'Grace Hopper',
    email: 'grace@apollo.dev',
    role: 'member',
    joinedLabel: 'Tham gia 3 tuần trước',
  },
  {
    id: 4,
    name: 'Ada Lovelace',
    email: 'ada@apollo.dev',
    role: 'member',
    joinedLabel: 'Tham gia 9 ngày trước',
  },
  {
    id: 5,
    name: 'Leo Turing',
    email: 'leo@apollo.dev',
    role: 'viewer',
    joinedLabel: 'Tham gia 2 ngày trước',
  },
];

const TABS = [
  { key: 'members', label: 'Thành viên' },
  { key: 'permissions', label: 'Phân quyền' },
];

// Panel phân quyền demo — state cục bộ để bấm switch thấy đổi (giống Member section design).
const PermissionsPanel = () => {
  const [perms, setPerms] = useState({ read: true, write: true, del: false, invite: false });
  const toggle = (k: keyof typeof perms) => setPerms((p) => ({ ...p, [k]: !p[k] }));
  return (
    <Surface>
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
        label="Mời thành viên"
        description="Gửi lời mời và gán vai trò."
        allowed={perms.invite}
        onToggle={() => toggle('invite')}
      />
      <Divider />
      <PermissionRow
        label="Xoá & quản trị"
        description="Xoá tài nguyên, gỡ thành viên (chỉ owner)."
        allowed={perms.del}
        onToggle={() => toggle('del')}
      />
    </Surface>
  );
};

// Màn Members — container: sống ở AppShell content. Có workspaceId → live (useWorkspaceMembers +
// useUsersByIds resolve tên/email). Không có → demo fallback để render không cần backend.
export const MembersScreen = ({ workspaceId }: { workspaceId?: number }) => {
  const isLive = typeof workspaceId === 'number' && Number.isFinite(workspaceId);
  const wsId = workspaceId ?? Number.NaN; // NaN → hook tự disable (enabled: Number.isFinite)

  const membersQuery = useWorkspaceMembers(wsId);
  const addMember = useAddMember(wsId);

  // Resolve user_id → tên/email/avatar (chỉ gọi khi live có member; demo ids rỗng → disabled).
  const userIds = useMemo(
    () => (membersQuery.data ?? []).map((m) => m.user_id),
    [membersQuery.data],
  );
  const usersQuery = useUsersByIds(userIds);

  const [tab, setTab] = useState('members');
  const [removed, setRemoved] = useState<Set<string | number>>(new Set());
  const [extra, setExtra] = useState<MemberData[]>([]); // invite thêm ở demo
  const [notice, setNotice] = useState<string | null>(null);

  // Member (snake_case) → MemberData; join với directory user đã resolve.
  const liveMembers: MemberData[] = useMemo(() => {
    const byId = new Map((usersQuery.data ?? []).map((u) => [u.id, u]));
    return (membersQuery.data ?? []).map((m) => {
      const u = byId.get(m.user_id);
      return {
        id: m.id,
        name: u?.name ?? `User #${m.user_id}`,
        email: u?.email,
        role: m.role ?? 'member',
        joinedLabel: joinedLabel(m.joined_at),
      };
    });
  }, [membersQuery.data, usersQuery.data]);

  const base = isLive ? liveMembers : [...DEMO_MEMBERS, ...extra];
  const members = base.filter((m) => !removed.has(m.id));

  // Gỡ thành viên: workspace-service chưa có remove-endpoint trong data-layer → chỉ ẩn cục bộ (UI).
  const handleRemove = (id: string | number) => {
    setRemoved((s) => new Set(s).add(id));
    setNotice('Đã gỡ thành viên khỏi danh sách (chỉ UI — chưa có endpoint remove).');
  };

  const handleInvite = (email: string, role: string) => {
    if (isLive) {
      // addMember cần user_id, KHÔNG phải email → flow thật: search user theo email → user_id →
      // addMember. Ở đây cho nhập thẳng user_id (chuỗi số) để mutation chạy thật, không gửi rác.
      const uid = Number(email);
      if (Number.isInteger(uid) && uid > 0) {
        addMember.mutate({ user_id: uid, role });
        setNotice(`Đang thêm user #${uid} với vai trò "${role}"…`);
        return;
      }
      setNotice(`Cần resolve "${email}" → user_id (user-search) trước khi mời. Vai trò: ${role}.`);
      return;
    }
    // Demo: thêm ngay vào danh sách cục bộ để thấy UI cập nhật.
    setExtra((list) => [
      ...list,
      { id: `new-${Date.now()}`, name: email.split('@')[0] || email, email, role },
    ]);
    setNotice(`Đã mời ${email} với vai trò "${role}" (demo).`);
  };

  const loading = isLive && membersQuery.isLoading;
  const errored = isLive && membersQuery.isError;

  return (
    <div>
      <Head>
        <Titles>
          <H>Members</H>
          <Sub>
            {members.length} thành viên · {isLive ? `workspace #${workspaceId}` : 'demo'}
          </Sub>
        </Titles>
        <Spacer />
        {members.length > 0 ? (
          <MemberAvatarStack names={members.map((m) => m.name)} max={5} />
        ) : null}
      </Head>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {notice ? (
        <div style={{ marginTop: 16 }}>
          <Callout icon={<Icon name="check" size={16} />} title="Thông báo">
            {notice}
          </Callout>
        </div>
      ) : null}

      {tab === 'members' ? (
        <>
          <Section>
            {loading ? (
              <LoadRow>
                <Spinner size={18} />
                Đang tải thành viên…
              </LoadRow>
            ) : errored ? (
              <Callout icon={<Icon name="inbox" size={16} />} title="Không tải được thành viên">
                {(membersQuery.error as Error)?.message ?? 'Đã có lỗi khi gọi workspace-service.'}
              </Callout>
            ) : members.length === 0 ? (
              <EmptyState
                icon={<Icon name="users" size={28} />}
                title="Chưa có thành viên"
                description="Mời người đầu tiên vào workspace bằng form bên dưới."
                action={
                  <Button variant="primary" size="sm" onClick={() => setTab('members')}>
                    Mời thành viên
                  </Button>
                }
              />
            ) : (
              <MemberList members={members} onRemove={handleRemove} />
            )}
          </Section>

          <Section>
            <SecTitle>Mời thành viên</SecTitle>
            <InviteCard>
              <InviteForm onInvite={handleInvite} />
            </InviteCard>
          </Section>
        </>
      ) : (
        <Section>
          <SecTitle>Phân quyền theo vai trò</SecTitle>
          <PermissionsPanel />
        </Section>
      )}
    </div>
  );
};
