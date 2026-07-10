import { styled } from '@mui/material/styles';
import {
  Button,
  Divider,
  EmptyState,
  FileCard,
  FileGrid,
  FileRow,
  Icon,
  Spinner,
  Surface,
  Tabs,
  UploadItem,
  UploadZone,
} from '@pm-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { type DragEvent, Fragment, useEffect, useRef, useState } from 'react';
import {
  type FileMeta,
  downloadFile,
  filesApi,
  useDeleteFile,
  useUploadFile,
} from '../features/files';

// ── Layout (styled + CSS var, mirror BoardScreen) ───────────────────────────
const Head = styled('div')({ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 });
const H = styled('h1')({
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-hi)',
});
const Sub = styled('span')({ fontSize: 13, color: 'var(--text-lo)' });
const Section = styled('div')({ display: 'flex', flexDirection: 'column', gap: 14 });
// Wrapper bắt sự kiện kéo-thả bao quanh UploadZone (UploadZone chỉ presentational).
const DropWrap = styled('div')({ width: '100%' });
const Center = styled('div')({ display: 'flex', justifyContent: 'center', padding: '48px 0' });
const ListWrap = styled(Surface)({ width: '100%' });

// Dữ liệu demo (không truyền workspaceId) — đủ nhóm mime để thấy badge màu khác nhau.
const DEMO_FILES: FileMeta[] = [
  {
    id: 1,
    owner_id: 1,
    name: 'anh-bia-trang-chu.png',
    mime: 'image/png',
    size: 840_000,
    s3_key: 'demo/anh-bia.png',
    s3_bucket: 'pm-attachments',
    etag: 'demo-1',
    created_at: '2026-07-09T08:00:00Z',
  },
  {
    id: 2,
    owner_id: 1,
    name: 'thiet-ke-he-thong.pdf',
    mime: 'application/pdf',
    size: 2_400_000,
    s3_key: 'demo/thiet-ke.pdf',
    s3_bucket: 'pm-attachments',
    etag: 'demo-2',
    created_at: '2026-07-08T10:30:00Z',
  },
  {
    id: 3,
    owner_id: 1,
    name: 'ban-giao-du-lieu.zip',
    mime: 'application/zip',
    size: 15_700_000,
    s3_key: 'demo/ban-giao.zip',
    s3_bucket: 'pm-attachments',
    etag: 'demo-3',
    created_at: '2026-07-05T14:15:00Z',
  },
  {
    id: 4,
    owner_id: 1,
    name: 'bien-ban-hop.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 62_000,
    s3_key: 'demo/bien-ban.docx',
    s3_bucket: 'pm-attachments',
    etag: 'demo-4',
    created_at: '2026-07-02T09:00:00Z',
  },
];

// created_at (ISO) → nhãn ngày gọn cho card/row; trả undefined nếu parse lỗi.
const createdLabel = (iso: string): string | undefined => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('vi-VN');
};

type View = 'grid' | 'list';
type Upload = { name: string; progress: number };

// Container màn Files: compose organism @pm-platform/ui + data layer ../features/files.
// Có workspaceId → gọi filesApi.list (live); không có → demo fallback render offline.
export const FilesScreen = ({ workspaceId }: { workspaceId?: number }) => {
  const isLive = workspaceId != null;

  const [view, setView] = useState<View>('grid');
  const [dragActive, setDragActive] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rampRef = useRef<number | null>(null);

  const uploadMut = useUploadFile();
  const deleteMut = useDeleteFile();

  // Hook list: features/files không có hook list sẵn → tự dựng bằng useQuery.
  // enabled theo isLive để chế độ demo không đụng backend.
  const query = useQuery({ queryKey: ['files'], queryFn: filesApi.list, enabled: isLive });
  const files: FileMeta[] = isLive ? (query.data ?? []) : DEMO_FILES;

  // Dọn interval ramp khi unmount.
  useEffect(
    () => () => {
      if (rampRef.current) window.clearInterval(rampRef.current);
    },
    [],
  );

  const openPicker = () => inputRef.current?.click();

  // Chạy upload 1 file: fetch không phát progress thật → ramp giả lập tới ~92% rồi chốt 100% khi xong.
  const runUpload = (file: File) => {
    setUpload({ name: file.name, progress: 6 });
    if (rampRef.current) window.clearInterval(rampRef.current);
    rampRef.current = window.setInterval(() => {
      setUpload((u) => (u && u.progress < 92 ? { ...u, progress: u.progress + 8 } : u));
    }, 160);

    const finish = () => {
      if (rampRef.current) window.clearInterval(rampRef.current);
      setUpload({ name: file.name, progress: 100 });
      window.setTimeout(() => setUpload(null), 1200);
    };
    const fail = () => {
      if (rampRef.current) window.clearInterval(rampRef.current);
      setUpload(null);
    };

    if (!isLive) {
      // Demo: không có backend → chỉ diễn hiệu ứng rồi tự hoàn tất.
      window.setTimeout(finish, 1200);
      return;
    }
    uploadMut.mutate(file, { onSuccess: finish, onError: fail });
  };

  const onFiles = (list: FileList | null) => {
    const file = list?.[0];
    if (file) runUpload(file);
  };

  // Kéo-thả: chặn hành vi mặc định (mở file trong tab) + đổi trạng thái active của UploadZone.
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    onFiles(e.dataTransfer.files);
  };

  // Tải xuống: downloadFile trả blob URL (kèm JWT) → mở tab mới; revoke sau ít phút.
  const onDownload = async (f: FileMeta) => {
    if (!isLive) return; // demo: không có file thật để tải
    try {
      const url = await downloadFile(f.id);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // best-effort: nuốt lỗi tải ở màn demo/container
    }
  };

  const onDelete = (f: FileMeta) => {
    if (!isLive) return; // demo: không mutate
    deleteMut.mutate(f.id);
  };

  const loading = isLive && query.isLoading;
  const empty = !loading && files.length === 0;

  return (
    <div>
      <Head>
        <H>Files</H>
        <Sub>
          {files.length} file{isLive ? '' : ' · demo'}
        </Sub>
      </Head>

      <Section>
        {/* input file native ẩn — UploadZone/EmptyState bấm để mở hộp thoại chọn file */}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = ''; // reset để chọn lại cùng file vẫn trigger
          }}
        />

        <DropWrap
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <UploadZone active={dragActive} onClick={openPicker} />
        </DropWrap>

        {upload ? <UploadItem name={upload.name} progress={upload.progress} /> : null}

        <Tabs
          tabs={[
            { key: 'grid', label: 'Lưới' },
            { key: 'list', label: 'Danh sách' },
          ]}
          value={view}
          onChange={(k) => setView(k as View)}
        />

        {loading ? (
          <Center>
            <Spinner size={22} />
          </Center>
        ) : empty ? (
          <EmptyState
            icon={<Icon name="inbox" size={26} />}
            title="Chưa có file nào"
            description="Kéo thả file vào vùng phía trên hoặc bấm để tải lên."
            action={
              <Button variant="primary" size="sm" onClick={openPicker}>
                Tải file lên
              </Button>
            }
          />
        ) : view === 'grid' ? (
          <FileGrid>
            {files.map((f) => (
              <FileCard
                key={f.id}
                name={f.name}
                mime={f.mime}
                size={f.size}
                createdLabel={createdLabel(f.created_at)}
                onDownload={() => onDownload(f)}
                onDelete={() => onDelete(f)}
              />
            ))}
          </FileGrid>
        ) : (
          <ListWrap>
            {files.map((f, i) => (
              <Fragment key={f.id}>
                {i > 0 ? <Divider /> : null}
                <FileRow
                  name={f.name}
                  mime={f.mime}
                  size={f.size}
                  createdLabel={createdLabel(f.created_at)}
                  onDownload={() => onDownload(f)}
                  onDelete={() => onDelete(f)}
                />
              </Fragment>
            ))}
          </ListWrap>
        )}
      </Section>
    </div>
  );
};
