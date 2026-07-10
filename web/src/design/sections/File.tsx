import {
  Divider,
  FileCard,
  FileGrid,
  FilePreview,
  FileRow,
  Surface,
  UploadItem,
  UploadZone,
} from '@pm-platform/ui';
import { Fragment } from 'react';
import { Doc, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

// Dữ liệu file demo (nhiều nhóm mime để thấy màu badge khác nhau: pdf→đỏ, ảnh→tím, khác→xanh).
const files = [
  {
    id: 1,
    name: 'thiet-ke-he-thong.pdf',
    mime: 'application/pdf',
    size: 2_400_000,
    createdLabel: '2 giờ trước',
  },
  {
    id: 2,
    name: 'anh-bia-trang-chu.png',
    mime: 'image/png',
    size: 840_000,
    createdLabel: 'Hôm qua',
  },
  { id: 3, name: 'ghi-chu-hop.txt', mime: 'text/plain', size: 1_240, createdLabel: '3 ngày trước' },
  {
    id: 4,
    name: 'ban-giao-du-lieu.zip',
    mime: 'application/zip',
    size: 15_700_000,
    createdLabel: 'Tuần trước',
  },
];

const noop = () => {};

// Module File tài liệu hoá: card/grid/row (list-view) + preview + upload zone + upload item.
export default function FileSection() {
  return (
    <div>
      <SectionTitle>File module</SectionTitle>
      <SectionLead>
        Bộ organism cho tính năng đính kèm & quản lý file (file-service · MinIO). Tất cả đều
        presentational: nhận dữ liệu qua props, phát sự kiện qua callback — không tự gọi API, không
        giữ state upload. Icon và màu badge suy tự động từ <code>mime</code> (ảnh → tím, tài
        liệu/pdf → đỏ, còn lại → xanh); dung lượng format bằng helper <code>formatSize</code>.
      </SectionLead>

      {/* ---------- FileCard ---------- */}
      <Doc
        name="FileCard"
        tagline="Thẻ hiển thị 1 file trong grid-view: badge icon theo mime, tên (ellipsis), dung lượng + thời điểm tạo, và 2 action Tải/Xoá."
      >
        <GroupLabel>Các nhóm mime</GroupLabel>
        <Specimen label="pdf · image · text · other">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              width: '100%',
            }}
          >
            {files.map((f) => (
              <FileCard
                key={f.id}
                name={f.name}
                mime={f.mime}
                size={f.size}
                createdLabel={f.createdLabel}
                onDownload={noop}
                onDelete={noop}
              />
            ))}
          </div>
        </Specimen>
        <GroupLabel>Không có createdLabel</GroupLabel>
        <Specimen label="chỉ tên + size">
          <div style={{ width: 240 }}>
            <FileCard
              name="khong-co-ngay.pdf"
              mime="application/pdf"
              size={512_000}
              onDownload={noop}
              onDelete={noop}
            />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên file (ellipsis 1 dòng khi dài).' },
            { name: 'mime', type: 'string', desc: 'MIME type — quyết định icon + màu badge.' },
            {
              name: 'size',
              type: 'number',
              desc: 'Dung lượng byte, hiển thị qua formatSize (cơ số 1024).',
            },
            {
              name: 'createdLabel',
              type: 'string',
              def: 'undefined',
              desc: 'Nhãn thời điểm tạo (đã format sẵn). Ẩn nếu bỏ trống.',
            },
            {
              name: 'onDownload',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm nút "Tải xuống".',
            },
            {
              name: 'onDelete',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm nút "Xoá" (variant danger).',
            },
          ]}
        />
      </Doc>

      {/* ---------- FileGrid ---------- */}
      <Doc
        name="FileGrid"
        tagline="Lưới auto-fill bọc nhiều FileCard — cột tối thiểu 220px, co giãn đều, gap 12. Caller tự map FileCard vào children."
      >
        <Specimen label="FileGrid > FileCard[]">
          <FileGrid>
            {files.map((f) => (
              <FileCard
                key={f.id}
                name={f.name}
                mime={f.mime}
                size={f.size}
                createdLabel={f.createdLabel}
                onDownload={noop}
                onDelete={noop}
              />
            ))}
          </FileGrid>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              def: 'undefined',
              desc: 'Danh sách FileCard (hoặc node bất kỳ) xếp vào lưới.',
            },
          ]}
        />
      </Doc>

      {/* ---------- FileRow ---------- */}
      <Doc
        name="FileRow"
        tagline="Dòng file compact cho list-view: badge icon + tên (co giãn) + dung lượng + ngày + action. Dùng khi cần mật độ cao hơn card."
      >
        <GroupLabel>Danh sách (bọc Surface + Divider)</GroupLabel>
        <Specimen label="Surface > FileRow[] + Divider">
          <Surface style={{ width: '100%' }}>
            {files.map((f, i) => (
              <Fragment key={f.id}>
                {i > 0 ? <Divider /> : null}
                <FileRow
                  name={f.name}
                  mime={f.mime}
                  size={f.size}
                  createdLabel={f.createdLabel}
                  onDownload={noop}
                  onDelete={noop}
                />
              </Fragment>
            ))}
          </Surface>
        </Specimen>
        <GroupLabel>Không có action / không có ngày</GroupLabel>
        <Specimen label="read-only">
          <Surface style={{ width: '100%' }}>
            <FileRow name="chi-doc-khong-action.pdf" mime="application/pdf" size={98_000} />
          </Surface>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên file (ellipsis, chiếm cột co giãn).' },
            { name: 'mime', type: 'string', desc: 'MIME type — quyết định icon + màu badge.' },
            { name: 'size', type: 'number', desc: 'Dung lượng byte (mono, canh phải).' },
            {
              name: 'createdLabel',
              type: 'string',
              def: 'undefined',
              desc: 'Nhãn ngày. Ẩn nếu bỏ trống.',
            },
            {
              name: 'onDownload',
              type: '() => void',
              def: 'undefined',
              desc: 'Nút "Tải" (ghost). Ẩn nếu không truyền.',
            },
            {
              name: 'onDelete',
              type: '() => void',
              def: 'undefined',
              desc: 'Nút "Xoá" (danger). Ẩn nếu không truyền.',
            },
          ]}
        />
      </Doc>

      {/* ---------- FilePreview ---------- */}
      <Doc
        name="FilePreview"
        tagline="Ô xem trước 1 file: ảnh → khung placeholder 16:10; file khác → icon lớn tô màu theo nhóm. Kèm tên + dung lượng bên dưới."
      >
        <GroupLabel>Ảnh vs tài liệu vs khác</GroupLabel>
        <Specimen label="image / document / other">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
              gap: 12,
              width: '100%',
            }}
          >
            <FilePreview name="anh-bia-trang-chu.png" mime="image/png" size={840_000} />
            <FilePreview name="thiet-ke-he-thong.pdf" mime="application/pdf" size={2_400_000} />
            <FilePreview name="ban-giao-du-lieu.zip" mime="application/zip" size={15_700_000} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên file (ellipsis).' },
            {
              name: 'mime',
              type: 'string',
              desc: 'MIME — image/* dùng khung placeholder, khác dùng icon lớn.',
            },
            { name: 'size', type: 'number', desc: 'Dung lượng byte (formatSize).' },
          ]}
        />
      </Doc>

      {/* ---------- UploadZone ---------- */}
      <Doc
        name="UploadZone"
        tagline="Vùng kéo-thả upload (bọc molecule Dropzone) — viền gạch đứt, đổi accent khi active. Trạng thái & click do container điều khiển."
      >
        <GroupLabel>Bình thường vs active (đang hover file)</GroupLabel>
        <Specimen label="active = false | true">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
            <UploadZone onClick={noop} />
            <UploadZone active onClick={noop} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'active',
              type: 'boolean',
              def: 'false',
              desc: 'Đang kéo file vào (viền + nền chuyển accent).',
            },
            {
              name: 'onClick',
              type: '() => void',
              def: 'undefined',
              desc: 'Bấm để mở hộp thoại chọn file.',
            },
          ]}
        />
      </Doc>

      {/* ---------- UploadItem ---------- */}
      <Doc
        name="UploadItem"
        tagline="Item 1 file đang upload: tên + % + thanh tiến độ. Đạt 100% → đổi màu xanh + hiện tick. Giá trị progress bị kẹp về [0,100]."
      >
        <GroupLabel>Các mốc tiến độ</GroupLabel>
        <Specimen label="0 · 42 · 78 · 100 (%)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <UploadItem name="video-demo.mp4" progress={0} />
            <UploadItem name="thiet-ke-he-thong.pdf" progress={42} />
            <UploadItem name="anh-bia-trang-chu.png" progress={78} />
            <UploadItem name="ghi-chu-hop.txt" progress={100} />
          </div>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'name', type: 'string', desc: 'Tên file đang upload (ellipsis).' },
            {
              name: 'progress',
              type: 'number',
              desc: 'Tiến độ 0–100 (tự kẹp về khoảng hợp lệ). ≥100 = xong.',
            },
          ]}
        />
      </Doc>
    </div>
  );
}
