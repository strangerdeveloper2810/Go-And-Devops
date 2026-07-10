// Issue (issue-service, Java 17). ⚠️ JSON camelCase (KHÁC các service Go dùng snake_case).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';

export type IssuePriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface Issue {
  id: number;
  projectId: number;
  key: string; // vd 'PROJ-1' (global-unique)
  typeId: number;
  summary: string;
  description: string | null;
  status: string;
  priority: IssuePriority;
  assigneeId: number | null;
  reporterId: number | null;
  parentId: number | null;
  sprintId: number | null;
  storyPoints: number | null;
  labels: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateIssueInput {
  typeId: number;
  summary: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: number;
  labels?: string[];
}
export interface UpdateIssueInput {
  summary?: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: number;
  labels?: string[];
}

export const issuesApi = {
  listByProject: (projectId: number) =>
    api.get<{ issues: Issue[] }>(`/projects/${projectId}/issues`).then((r) => r.issues),
  get: (key: string) => api.get<{ issue: Issue }>(`/issues/${key}`).then((r) => r.issue),
  create: (projectId: number, input: CreateIssueInput) =>
    api.post<{ issue: Issue }>(`/projects/${projectId}/issues`, input).then((r) => r.issue),
  update: (key: string, input: UpdateIssueInput) =>
    api.patch<{ issue: Issue }>(`/issues/${key}`, input).then((r) => r.issue),
  // POST /issues/:key/transitions { toStatus } — chuyển workflow (409 nếu transition không hợp lệ).
  transition: (key: string, toStatus: string) =>
    api.post<{ issue: Issue }>(`/issues/${key}/transitions`, { toStatus }).then((r) => r.issue),
};

// ── Hooks ─────────────────────────────────────────────────────────────────
export const useProjectIssues = (projectId: number) =>
  useQuery({
    queryKey: queryKeys.issues.byProject(projectId),
    queryFn: () => issuesApi.listByProject(projectId),
    enabled: Number.isFinite(projectId),
  });

export const useIssue = (key: string) =>
  useQuery({
    queryKey: queryKeys.issues.detail(key),
    queryFn: () => issuesApi.get(key),
    enabled: key.length > 0,
  });

export const useCreateIssue = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIssueInput) => issuesApi.create(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.issues.byProject(projectId) }),
  });
};

export const useUpdateIssue = (key: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateIssueInput) => issuesApi.update(key, input),
    onSuccess: (issue) => {
      qc.setQueryData(queryKeys.issues.detail(key), issue);
      qc.invalidateQueries({ queryKey: queryKeys.issues.byProject(issue.projectId) });
    },
  });
};

export const useTransitionIssue = (key: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toStatus: string) => issuesApi.transition(key, toStatus),
    onSuccess: (issue) => {
      qc.setQueryData(queryKeys.issues.detail(key), issue);
      qc.invalidateQueries({ queryKey: queryKeys.issues.byProject(issue.projectId) });
    },
  });
};
