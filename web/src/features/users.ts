// User directory (auth-service): resolve theo id (avatar/@mention) hoặc search picker.
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
}

export const usersApi = {
  // GET /users?ids=1,2,3 → resolve nhiều user 1 lần (tránh N+1 request).
  byIds: (ids: readonly number[]) =>
    api.get<{ users: User[] }>('/users', { params: { ids: ids.join(',') } }).then((r) => r.users),
  // GET /users?search=foo → picker / @mention.
  search: (q: string) =>
    api.get<{ users: User[] }>('/users', { params: { search: q } }).then((r) => r.users),
  // GET /users/:id
  getById: (id: number) => api.get<{ user: User }>(`/users/${id}`).then((r) => r.user),
};

export const useUsersByIds = (ids: readonly number[]) =>
  useQuery({
    queryKey: queryKeys.users.byIds(ids),
    queryFn: () => usersApi.byIds(ids),
    enabled: ids.length > 0,
  });

export const useUserSearch = (q: string) =>
  useQuery({
    queryKey: queryKeys.users.search(q),
    queryFn: () => usersApi.search(q),
    enabled: q.trim().length > 0,
  });

export const useUser = (id: number) =>
  useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: Number.isFinite(id),
  });
