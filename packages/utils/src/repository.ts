import type { HttpClient, RequestConfig } from '@pm-platform/api-client';

/**
 * Repository Pattern — base factory cho CRUD operations trên một resource.
 * Mỗi service resource (workspace, issue, page...) tạo 1 repository instance.
 *
 * @example
 * const workspaceRepo = createRepository<Workspace>('/workspaces');
 * const result = await workspaceRepo.getAll(api);
 * if (result.ok) { ... }
 */
export const createRepository = <T>(basePath: string) => {
  const path = basePath.startsWith('/') ? basePath : `/${basePath}`;

  return {
    /** GET /resource — lấy danh sách */
    getAll: (client: HttpClient, config?: RequestConfig) => client.safeGet<T[]>(path, config),

    /** GET /resource/:id — lấy 1 item */
    getById: (client: HttpClient, id: string, config?: RequestConfig) =>
      client.safeGet<T>(`${path}/${id}`, config),

    /** POST /resource — tạo mới */
    create: (client: HttpClient, body: Partial<T>, config?: RequestConfig) =>
      client.safePost<T>(path, body, config),

    /** PATCH /resource/:id — cập nhật 1 phần */
    update: (client: HttpClient, id: string, body: Partial<T>, config?: RequestConfig) =>
      client.safePatch<T>(`${path}/${id}`, body, config),

    /** PUT /resource/:id — thay thế toàn bộ */
    replace: (client: HttpClient, id: string, body: T, config?: RequestConfig) =>
      client.safePut<T>(`${path}/${id}`, body, config),

    /** DELETE /resource/:id — xoá */
    remove: (client: HttpClient, id: string, config?: RequestConfig) =>
      client.safeDelete<void>(`${path}/${id}`, config),
  };
};

export type Repository<T> = ReturnType<typeof createRepository<T>>;
