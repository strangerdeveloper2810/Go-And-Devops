// Workspace / member / project. Response snake_case (workspace-service). Endpoint dưới /workspaces.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  owner_id: number;
  plan: string; // 'free' | 'pro' | 'team'
  created_at: string;
  updated_at: string;
}
export interface Member {
  id: number;
  workspace_id: number;
  user_id: number;
  role_id: number;
  joined_at: string;
  role?: string; // tên role (khi backend join)
}
export interface Project {
  id: number;
  workspace_id: number;
  key: string;
  name: string;
  lead_id?: number;
  created_at: string;
  updated_at: string;
}
export interface CreateWorkspaceInput {
  name: string;
}
export interface AddMemberInput {
  user_id: number;
  role: string; // TÊN role (vd 'member' | 'owner') — KHÔNG phải role_id
}
export interface CreateProjectInput {
  key: string;
  name: string;
}

export const workspacesApi = {
  list: () => api.get<{ workspaces: Workspace[] }>('/workspaces').then((r) => r.workspaces),
  get: (id: number) =>
    api.get<{ workspace: Workspace }>(`/workspaces/${id}`).then((r) => r.workspace),
  create: (input: CreateWorkspaceInput) =>
    api.post<{ workspace: Workspace }>('/workspaces', input).then((r) => r.workspace),
  members: (id: number) =>
    api.get<{ members: Member[] }>(`/workspaces/${id}/members`).then((r) => r.members),
  addMember: (id: number, input: AddMemberInput) =>
    api.post<{ member: Member }>(`/workspaces/${id}/members`, input).then((r) => r.member),
  projects: (id: number) =>
    api.get<{ projects: Project[] }>(`/workspaces/${id}/projects`).then((r) => r.projects),
  createProject: (id: number, input: CreateProjectInput) =>
    api.post<{ project: Project }>(`/workspaces/${id}/projects`, input).then((r) => r.project),
};

// ── Hooks ─────────────────────────────────────────────────────────────────
export const useWorkspaces = () =>
  useQuery({ queryKey: queryKeys.workspaces.all, queryFn: workspacesApi.list });

export const useWorkspace = (id: number) =>
  useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => workspacesApi.get(id),
    enabled: Number.isFinite(id),
  });

export const useCreateWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.all }),
  });
};

export const useWorkspaceMembers = (id: number) =>
  useQuery({
    queryKey: queryKeys.workspaces.members(id),
    queryFn: () => workspacesApi.members(id),
    enabled: Number.isFinite(id),
  });

export const useAddMember = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMemberInput) => workspacesApi.addMember(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.members(id) }),
  });
};

export const useWorkspaceProjects = (id: number) =>
  useQuery({
    queryKey: queryKeys.workspaces.projects(id),
    queryFn: () => workspacesApi.projects(id),
    enabled: Number.isFinite(id),
  });

export const useCreateProject = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => workspacesApi.createProject(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.projects(id) }),
  });
};
