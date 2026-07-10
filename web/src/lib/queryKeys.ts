// Query key tập trung cho TanStack Query — tránh lệch key giữa các nơi, dễ invalidate đúng nhánh.
// Convention: mảng [scope, ...params]. `as const` để type suy ra literal (đỡ typo).

export const queryKeys = {
  me: ['me'] as const,
  users: {
    byIds: (ids: readonly number[]) => ['users', 'ids', ...ids] as const,
    search: (q: string) => ['users', 'search', q] as const,
    detail: (id: number) => ['users', id] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: number) => ['workspaces', id] as const,
    members: (id: number) => ['workspaces', id, 'members'] as const,
    projects: (id: number) => ['workspaces', id, 'projects'] as const,
  },
  issues: {
    byProject: (projectId: number) => ['projects', projectId, 'issues'] as const,
    detail: (key: string) => ['issues', key] as const,
  },
  spaces: {
    byWorkspace: (workspaceId: number) => ['spaces', 'workspace', workspaceId] as const,
  },
  pages: {
    detail: (id: number) => ['pages', id] as const,
    children: (id: number) => ['pages', id, 'children'] as const,
  },
  files: {
    detail: (id: number) => ['files', id] as const,
  },
} as const;
