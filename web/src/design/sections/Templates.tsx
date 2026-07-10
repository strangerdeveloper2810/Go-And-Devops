import { Button, PageContainer, StackList, Surface, Text, Toolbar, TwoPane } from '@pm-platform/ui';
import { Code, Doc, GroupLabel, PropsTable, SectionLead, SectionTitle, Specimen } from '../kit';

/**
 * Templates — khung bố cục cấp trang, tái sử dụng cho mọi module.
 * Đều là styled <div> presentational: quyết định layout (canh giữa, 2 cột, hàng công cụ,
 * danh sách dọc) chứ không chứa nội dung domain. Nội dung dưới đây là giả (Surface/Text).
 */

// Nội dung giả cho các ô demo.
const Fake = ({ h = 'Nội dung', s }: { h?: string; s?: string }) => (
  <>
    <Text variant="h3" style={{ display: 'block', marginBottom: 4 }}>
      {h}
    </Text>
    {s ? <Text variant="muted">{s}</Text> : null}
  </>
);

export default function TemplatesSection() {
  return (
    <div>
      <SectionTitle>Templates</SectionTitle>
      <SectionLead>
        Khung bố cục cấp trang — tầng cao nhất của atomic design. Ghép organism vào các template này
        để dựng màn hoàn chỉnh: <Code>PageContainer</Code> giới hạn bề rộng đọc,{' '}
        <Code>TwoPane</Code> chia sidebar + nội dung, <Code>Toolbar</Code> là hàng tiêu đề/hành
        động, <Code>StackList</Code> xếp chồng dọc cách đều.
      </SectionLead>

      {/* PAGE CONTAINER */}
      <Doc
        name="PageContainer"
        tagline="Bọc nội dung, giới hạn bề rộng đọc (maxWidth 960) và canh giữa (margin auto). Dùng ngoài cùng của trang có nội dung dài."
      >
        <Specimen>
          <PageContainer>
            <Surface style={{ padding: 20 }}>
              <Fake
                h="Trang trong PageContainer"
                s="Rộng tối đa 960px, luôn canh giữa vùng chứa — dễ đọc trên màn hình rộng."
              />
            </Surface>
          </PageContainer>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Nội dung trang được canh giữa & giới hạn bề rộng.',
            },
            {
              name: '...divProps',
              type: 'HTMLDivAttributes',
              desc: 'Là styled <div> (maxWidth 960, margin auto, width 100%) — nhận mọi prop của div.',
            },
          ]}
        />
      </Doc>

      {/* TWO PANE */}
      <Doc
        name="TwoPane"
        tagline="Bố cục 2 cột: sidebar cố định (asideWidth px) + nội dung co giãn (1fr). Vd Pages: cây trái + viewer phải. gap 16, alignItems start."
      >
        <GroupLabel>Mặc định · asideWidth 260</GroupLabel>
        <Specimen>
          <TwoPane style={{ width: '100%' }}>
            <Surface inset style={{ padding: 14 }}>
              <Text variant="caption" style={{ display: 'block', marginBottom: 10 }}>
                ASIDE · 260px
              </Text>
              <StackList gap={6}>
                {['Tổng quan', 'Thành viên', 'Cài đặt'].map((n) => (
                  <Text key={n} variant="muted">
                    {n}
                  </Text>
                ))}
              </StackList>
            </Surface>
            <Surface style={{ padding: 18 }}>
              <Fake
                h="Nội dung chính"
                s="Cột phải chiếm phần còn lại (1fr), tự co giãn theo bề ngang."
              />
            </Surface>
          </TwoPane>
        </Specimen>

        <GroupLabel>Hẹp hơn · asideWidth 200</GroupLabel>
        <Specimen>
          <TwoPane asideWidth={200} style={{ width: '100%' }}>
            <Surface inset style={{ padding: 14 }}>
              <Text variant="caption">ASIDE · 200px</Text>
            </Surface>
            <Surface style={{ padding: 18 }}>
              <Fake h="Nội dung chính" s="asideWidth điều khiển cột trái; cột phải luôn 1fr." />
            </Surface>
          </TwoPane>
        </Specimen>

        <PropsTable
          rows={[
            {
              name: 'asideWidth',
              type: 'number',
              def: '260',
              desc: 'Bề rộng cột trái (px). Cột phải luôn là 1fr.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Đúng 2 phần tử: [aside, main] theo thứ tự.',
            },
          ]}
        />
      </Doc>

      {/* TOOLBAR */}
      <Doc
        name="Toolbar"
        tagline="Hàng tiêu đề/hành động phía trên nội dung: flex, align center, gap 12, marginBottom 16. Đặt spacer (flex:1) để đẩy nút sang phải."
      >
        <Specimen>
          <Toolbar style={{ width: '100%', marginBottom: 0 }}>
            <Text variant="h3">Danh sách issue</Text>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="subtle">
              Lọc
            </Button>
            <Button size="sm" variant="primary">
              + Tạo mới
            </Button>
          </Toolbar>
        </Specimen>
        <PropsTable
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Tiêu đề + spacer + hành động. Xếp theo dòng, canh giữa theo trục dọc.',
            },
            {
              name: '...divProps',
              type: 'HTMLDivAttributes',
              desc: 'Là styled <div> — override được style/marginBottom khi cần.',
            },
          ]}
        />
      </Doc>

      {/* STACK LIST */}
      <Doc
        name="StackList"
        tagline="Xếp chồng dọc, cách đều (gap px). Dùng cho list card, hàng cài đặt, feed — thay cho việc lặp margin thủ công."
      >
        <Specimen>
          <StackList gap={8} style={{ width: '100%' }}>
            {[
              'Thiết kế trang đăng nhập',
              'Tích hợp gRPC verify token',
              'Viết migration schema workspace',
            ].map((t) => (
              <Surface
                key={t}
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <Text variant="body">{t}</Text>
              </Surface>
            ))}
          </StackList>
        </Specimen>
        <PropsTable
          rows={[
            { name: 'gap', type: 'number', def: '8', desc: 'Khoảng cách dọc giữa các item (px).' },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Danh sách item xếp chồng theo chiều dọc.',
            },
          ]}
        />
      </Doc>
    </div>
  );
}
