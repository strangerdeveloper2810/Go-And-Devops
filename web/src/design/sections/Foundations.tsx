import { styled } from '@mui/material/styles';
import { Icon, Text } from '@pm-platform/ui';
import type { IconName } from '@pm-platform/ui';
import {
  Code,
  Doc,
  Grid,
  GroupLabel,
  ScaleItem,
  SectionLead,
  SectionTitle,
  Specimen,
  Swatch,
} from '../kit';

/**
 * Foundations — tầng nền của design system "Graphite Console".
 * Mọi token trình bày qua CSS var (var(--x)) nên tự động đổi theo dark/light.
 */

// Ô demo transition — hover để cảm nhận easing var(--ease) + duration var(--dur).
const HoverDemo = styled('div')({
  width: 160,
  height: 68,
  borderRadius: 'var(--r-lg)',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-mid)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12.5,
  cursor: 'pointer',
  transition:
    'transform var(--dur) var(--ease), background var(--dur) var(--ease), border-color var(--dur) var(--ease), color var(--dur) var(--ease)',
  '&:hover': {
    transform: 'translateY(-3px)',
    background: 'var(--surface-3)',
    borderColor: 'var(--accent)',
    color: 'var(--text-hi)',
  },
});

// Ô nền accent-dim cho thang spacing (bề rộng = đúng px cần minh hoạ).
const SpaceBox = styled('div')({
  height: 18,
  background: 'var(--accent-dim)',
  border: '1px solid color-mix(in srgb, var(--accent) 32%, transparent)',
  borderRadius: 3,
});

// Ô minh hoạ bo góc.
const RadiusBox = styled('div')({
  width: 76,
  height: 46,
  background: 'var(--accent-dim)',
  border: '1px solid var(--border-strong)',
});

// Ô minh hoạ đổ bóng (nền surface-2 để bóng nổi rõ).
const ShadowBox = styled('div')({
  width: 124,
  height: 52,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
});

// Thẻ khuyến nghị (Do / Don't) — viền + tiêu đề theo màu semantic.
const GuideCard = styled('div', { shouldForwardProp: (p) => p !== 'tone' })<{
  tone: 'do' | 'dont';
}>(({ tone }) => ({
  border:
    tone === 'do'
      ? '1px solid color-mix(in srgb, var(--accent) 34%, transparent)'
      : '1px solid color-mix(in srgb, var(--red) 34%, transparent)',
  background:
    tone === 'do'
      ? 'color-mix(in srgb, var(--accent) 6%, var(--surface-1))'
      : 'color-mix(in srgb, var(--red) 6%, var(--surface-1))',
  borderRadius: 'var(--r-lg)',
  padding: '14px 16px',
}));

// ── Dữ liệu màu: nhóm + vai trò (role) từng token ─────────────────────────────
const COLORS: { group: string; items: { n: string; role: string }[] }[] = [
  {
    group: 'Nền & bề mặt',
    items: [
      { n: 'bg', role: 'Nền gốc toàn app' },
      { n: 'surface-1', role: 'Bề mặt chìm: input, sidebar, inset' },
      { n: 'surface-2', role: 'Bề mặt card mặc định' },
      { n: 'surface-3', role: 'Bề mặt nổi / trạng thái hover' },
    ],
  },
  {
    group: 'Viền',
    items: [
      { n: 'border', role: 'Hairline phân cách mặc định' },
      { n: 'border-strong', role: 'Viền nhấn: hover, header, scrollbar' },
    ],
  },
  {
    group: 'Chữ',
    items: [
      { n: 'text-hi', role: 'Chữ chính, tiêu đề, nội dung' },
      { n: 'text-mid', role: 'Chữ phụ, mô tả, label' },
      { n: 'text-lo', role: 'Chữ mờ: caption, placeholder' },
    ],
  },
  {
    group: 'Thương hiệu / Accent',
    items: [
      { n: 'accent', role: 'Màu thương hiệu (lime): CTA, focus' },
      { n: 'accent-dim', role: 'Nền accent mờ: focus ring, badge' },
      { n: 'accent-contrast', role: 'Chữ đặt trên nền accent' },
    ],
  },
  {
    group: 'Semantic',
    items: [
      { n: 'red', role: 'Nguy hiểm / xoá / lỗi' },
      { n: 'amber', role: 'Cảnh báo' },
      { n: 'blue', role: 'Thông tin / link' },
      { n: 'green', role: 'Thành công' },
      { n: 'violet', role: 'Nhấn phụ / kiểu (type)' },
    ],
  },
];

// ── Thang chữ ────────────────────────────────────────────────────────────────
const TYPE = [
  { v: 'h1', sample: 'The quick brown fox', spec: '28px · 600 · -0.022em · lh 1.12' },
  { v: 'h2', sample: 'The quick brown fox', spec: '21px · 600 · -0.018em' },
  { v: 'h3', sample: 'The quick brown fox', spec: '17px · 600 · -0.012em' },
  {
    v: 'body',
    sample: 'The quick brown fox jumps over the lazy dog',
    spec: '14px · 400 · lh 1.55',
  },
  {
    v: 'muted',
    sample: 'The quick brown fox jumps over the lazy dog',
    spec: '13px · 400 · text-mid',
  },
  { v: 'caption', sample: 'THE QUICK BROWN FOX', spec: '12px · 400 · +0.01em · text-lo' },
  { v: 'mono', sample: 'const key = "PM-42";', spec: '13px · Geist Mono · text-mid' },
] as const;

// ── Thang spacing (px) ───────────────────────────────────────────────────────
const SPACING = [4, 8, 12, 16, 24, 32, 48];

// ── Bo góc ───────────────────────────────────────────────────────────────────
const RADII: { label: string; v: string }[] = [
  { label: '--r-sm · 6px', v: 'var(--r-sm)' },
  { label: '--r-md · 8px', v: 'var(--r-md)' },
  { label: '--r-lg · 12px', v: 'var(--r-lg)' },
  { label: '--r-pill · 999px', v: 'var(--r-pill)' },
];

// ── Iconography (toàn bộ line-icon của hệ thống) ─────────────────────────────
const ICONS: IconName[] = [
  'board',
  'inbox',
  'doc',
  'file',
  'users',
  'search',
  'plus',
  'settings',
  'check',
  'clock',
  'chevron',
  'back',
  'sun',
  'moon',
  'palette',
  'logout',
];

// ── Do / Don't ───────────────────────────────────────────────────────────────
const DO = [
  'Dùng token CSS (var(--x)) thay vì hardcode hex/px — tự động theo dark & light.',
  'accent (lime) chỉ dành cho MỘT hành động chính mỗi màn; còn lại subtle / ghost.',
  'Chữ: text-hi cho nội dung, text-mid cho phụ, text-lo cho caption/placeholder.',
  'Bám thang spacing 4/8/12/16/24/32/48 — không chế số lẻ.',
  'Màu semantic đúng nghĩa: red = xoá/lỗi, green = thành công, amber = cảnh báo, blue = thông tin.',
];
const DONT = [
  'Đừng hardcode #hex hay px cho radius — mất khả năng theme-able.',
  'Đừng dùng accent cho nhiều nút cùng lúc (loãng CTA, mất điểm nhấn).',
  'Đừng đặt text-lo lên surface-1 cho nội dung quan trọng (thiếu tương phản).',
  'Đừng tự chế thang spacing/màu ngoài bộ token.',
  'Đừng dùng shadow-2 cho phần tử tĩnh — chỉ cho lớp nổi (popover, dialog).',
];

export default function FoundationsSection() {
  return (
    <div>
      <SectionTitle>Foundations</SectionTitle>
      <SectionLead>
        Tầng nền của "Graphite Console": màu, chữ, khoảng cách, bo góc, đổ bóng, chuyển động và
        icon. Toàn bộ được biểu diễn qua CSS variable (<Code>var(--x)</Code>) — component chỉ tham
        chiếu token, nhờ đó đổi dark/light chỉ bằng cách thay biến ở tầng gốc.
      </SectionLead>

      {/* COLOR */}
      <Doc
        name="Color"
        tagline="Bảng màu semantic, vai trò rõ ràng. Value đọc từ CSS var nên tự đổi theo theme."
      >
        {COLORS.map((g) => (
          <div key={g.group}>
            <GroupLabel>{g.group}</GroupLabel>
            <Grid min={158}>
              {g.items.map((c) => (
                <div key={c.n}>
                  <Swatch name={c.n} value={`var(--${c.n})`} />
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-mid)',
                      marginTop: 5,
                      lineHeight: 1.4,
                    }}
                  >
                    {c.role}
                  </div>
                </div>
              ))}
            </Grid>
          </div>
        ))}
      </Doc>

      {/* TYPOGRAPHY */}
      <Doc
        name="Typography"
        tagline="Thang chữ dựa trên font Geist (sans) + Geist Mono. Dùng qua atom <Text variant>."
      >
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            background: 'var(--bg)',
            padding: '4px 18px',
          }}
        >
          {TYPE.map((t) => (
            <div
              key={t.v}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 20,
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ width: 64, flexShrink: 0 }}>
                <Code>{t.v}</Code>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant={t.v}>{t.sample}</Text>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-lo)',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {t.spec}
              </div>
            </div>
          ))}
        </div>
      </Doc>

      {/* SPACING */}
      <Doc
        name="Spacing"
        tagline="Thang khoảng cách 4-based. Dùng cho gap, padding, margin — nhất quán nhịp điệu."
      >
        <Specimen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {SPACING.map((s) => (
              <ScaleItem key={s} label={`${s}px`} box={<SpaceBox style={{ width: s }} />} />
            ))}
          </div>
        </Specimen>
      </Doc>

      {/* RADIUS */}
      <Doc
        name="Radius"
        tagline="Bo góc chuẩn hoá: sm cho tag/kbd, md cho input/nút, lg cho card, pill cho chip tròn."
      >
        <Specimen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            {RADII.map((r) => (
              <ScaleItem
                key={r.v}
                label={r.label}
                box={<RadiusBox style={{ borderRadius: r.v }} />}
              />
            ))}
          </div>
        </Specimen>
      </Doc>

      {/* ELEVATION */}
      <Doc
        name="Elevation / Shadow"
        tagline="Hai mức đổ bóng: shadow-1 cho nổi nhẹ (card hover), shadow-2 cho lớp overlay (popover, dialog)."
      >
        <Specimen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
            <ScaleItem
              label="--shadow-1"
              box={<ShadowBox style={{ boxShadow: 'var(--shadow-1)' }} />}
            />
            <ScaleItem
              label="--shadow-2"
              box={<ShadowBox style={{ boxShadow: 'var(--shadow-2)' }} />}
            />
          </div>
        </Specimen>
      </Doc>

      {/* MOTION */}
      <Doc
        name="Motion"
        tagline="Chuyển động ngắn & tự nhiên: easing var(--ease) (cubic-bezier ease-out) + duration var(--dur) = 150ms."
      >
        <Grid min={220}>
          <div>
            <GroupLabel>Token</GroupLabel>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13,
                color: 'var(--text-mid)',
              }}
            >
              <div>
                <Code>--ease</Code> = cubic-bezier(0.16, 1, 0.3, 1)
              </div>
              <div>
                <Code>--dur</Code> = 150ms
              </div>
              <div style={{ color: 'var(--text-lo)', fontSize: 12.5, lineHeight: 1.5 }}>
                Dùng cho hover/focus/transition. Tránh animation dài (&gt;300ms) trong UI thao tác.
              </div>
            </div>
          </div>
          <div>
            <GroupLabel>Thử hover</GroupLabel>
            <HoverDemo>hover vào tôi →</HoverDemo>
          </div>
        </Grid>
      </Doc>

      {/* ICONOGRAPHY */}
      <Doc
        name="Iconography"
        tagline="Line-icon 24×24, stroke 1.6, currentColor — hợp thẩm mỹ console. Dùng qua <Icon name size>."
      >
        <Grid min={104}>
          {ICONS.map((n) => (
            <div
              key={n}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 9,
                padding: '16px 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-1)',
                color: 'var(--text-hi)',
              }}
            >
              <Icon name={n} size={22} />
              <span
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-lo)' }}
              >
                {n}
              </span>
            </div>
          ))}
        </Grid>
      </Doc>

      {/* DO & DON'T */}
      <Doc
        name="Do & Don't"
        tagline="Quy tắc rút gọn để giữ giao diện nhất quán khi hybrid (agent + người) cùng dựng UI."
      >
        <Grid min={300}>
          <GuideCard tone="do">
            <div
              style={{
                color: 'var(--accent)',
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 10,
                letterSpacing: '0.02em',
              }}
            >
              ✓ NÊN
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {DO.map((d) => (
                <li key={d} style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                  {d}
                </li>
              ))}
            </ul>
          </GuideCard>
          <GuideCard tone="dont">
            <div
              style={{
                color: 'var(--red)',
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 10,
                letterSpacing: '0.02em',
              }}
            >
              ✗ KHÔNG
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {DONT.map((d) => (
                <li key={d} style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                  {d}
                </li>
              ))}
            </ul>
          </GuideCard>
        </Grid>
      </Doc>
    </div>
  );
}
