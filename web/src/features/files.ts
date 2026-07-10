// File upload/download/metadata (file-service qua MinIO). Response snake_case.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryKeys';
import { session } from '../lib/session';

export interface FileMeta {
  id: number;
  owner_id: number;
  workspace_id?: number;
  name: string;
  mime: string;
  size: number;
  s3_key: string;
  s3_bucket: string;
  etag: string;
  created_at: string;
}

const baseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** URL nội dung file (binary). LƯU Ý: endpoint này cần Bearer → dùng downloadFile, KHÔNG gán thẳng vào <img src>. */
export const fileContentUrl = (id: number): string => `${baseUrl}/files/${id}/content`;

/** Tải file kèm JWT (vì <img>/<a> không tự gửi Bearer) → trả blob URL. Nhớ URL.revokeObjectURL sau khi dùng. */
export const downloadFile = async (id: number): Promise<string> => {
  const token = session.getAccessToken();
  const res = await fetch(fileContentUrl(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return URL.createObjectURL(await res.blob());
};

export const filesApi = {
  // POST /files — multipart, field BẮT BUỘC tên 'file'. (Nếu backend nhận thêm field metadata thì append vào fd.)
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<{ file: FileMeta }>('/files', fd).then((r) => r.file);
  },
  list: () => api.get<{ files: FileMeta[] }>('/files').then((r) => r.files),
  get: (id: number) => api.get<{ file: FileMeta }>(`/files/${id}`).then((r) => r.file),
  remove: (id: number) => api.delete<void>(`/files/${id}`),
};

// ── Hooks ─────────────────────────────────────────────────────────────────
export const useFile = (id: number) =>
  useQuery({
    queryKey: queryKeys.files.detail(id),
    queryFn: () => filesApi.get(id),
    enabled: Number.isFinite(id),
  });

export const useUploadFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => filesApi.upload(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
};

export const useDeleteFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => filesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
};
