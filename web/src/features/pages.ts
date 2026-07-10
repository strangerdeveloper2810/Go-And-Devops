// Confluence-style spaces & pages (page-service).
// ⚠️ Casing: RESPONSE snake_case (space_id, content_html...) NHƯNG REQUEST camelCase
// (workspaceId, contentHtml, parentId) — theo binding hiện tại của page-service.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';

export interface Space {
  id: number;
  workspace_id: number;
  key: string;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}
export interface Page {
  id: number;
  space_id: number;
  parent_id: number | null;
  title: string;
  slug: string;
  content_html: string; // ⚠️ HTML thô — PHẢI sanitize (DOMPurify) trước dangerouslySetInnerHTML (chống XSS)
  content_text: string;
  author_id: number;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface CreateSpaceInput {
  workspaceId: number; // camelCase (request)
  key: string;
  name: string;
}
export interface CreatePageInput {
  title: string;
  contentHtml?: string; // camelCase (request)
  parentId?: number;
}
export interface UpdatePageInput {
  title?: string;
  contentHtml?: string;
  parentId?: number;
}

export const pagesApi = {
  listSpaces: (workspaceId: number) =>
    api.get<{ spaces: Space[] }>('/spaces', { params: { workspaceId } }).then((r) => r.spaces),
  createSpace: (input: CreateSpaceInput) =>
    api.post<{ space: Space }>('/spaces', input).then((r) => r.space),
  listPages: (spaceId: number) =>
    api.get<{ pages: Page[] }>(`/spaces/${spaceId}/pages`).then((r) => r.pages),
  createPage: (spaceId: number, input: CreatePageInput) =>
    api.post<{ page: Page }>(`/spaces/${spaceId}/pages`, input).then((r) => r.page),
  getPage: (id: number) => api.get<{ page: Page }>(`/pages/${id}`).then((r) => r.page),
  children: (id: number) =>
    api.get<{ pages: Page[] }>(`/pages/${id}/children`).then((r) => r.pages),
  updatePage: (id: number, input: UpdatePageInput) =>
    api.patch<{ page: Page }>(`/pages/${id}`, input).then((r) => r.page),
  deletePage: (id: number) => api.delete<void>(`/pages/${id}`),
};

// ── Hooks ─────────────────────────────────────────────────────────────────
export const useSpaces = (workspaceId: number) =>
  useQuery({
    queryKey: queryKeys.spaces.byWorkspace(workspaceId),
    queryFn: () => pagesApi.listSpaces(workspaceId),
    enabled: Number.isFinite(workspaceId),
  });

export const useCreateSpace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pagesApi.createSpace,
    onSuccess: (space) =>
      qc.invalidateQueries({ queryKey: queryKeys.spaces.byWorkspace(space.workspace_id) }),
  });
};

export const usePage = (id: number) =>
  useQuery({
    queryKey: queryKeys.pages.detail(id),
    queryFn: () => pagesApi.getPage(id),
    enabled: Number.isFinite(id),
  });

export const usePageChildren = (id: number) =>
  useQuery({
    queryKey: queryKeys.pages.children(id),
    queryFn: () => pagesApi.children(id),
    enabled: Number.isFinite(id),
  });

export const useCreatePage = (spaceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) => pagesApi.createPage(spaceId, input),
    onSuccess: (page) => {
      if (page.parent_id != null) {
        qc.invalidateQueries({ queryKey: queryKeys.pages.children(page.parent_id) });
      }
    },
  });
};

export const useUpdatePage = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePageInput) => pagesApi.updatePage(id, input),
    onSuccess: (page) => qc.setQueryData(queryKeys.pages.detail(id), page),
  });
};
