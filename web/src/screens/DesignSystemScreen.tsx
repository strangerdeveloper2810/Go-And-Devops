import { styled } from '@mui/material/styles';
import { Icon, Text } from '@pm-platform/ui';
import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import Atoms from '../design/sections/Atoms';
import Auth from '../design/sections/Auth';
import File from '../design/sections/File';
import Foundations from '../design/sections/Foundations';
import Issue from '../design/sections/Issue';
import Member from '../design/sections/Member';
import Molecules from '../design/sections/Molecules';
import Page from '../design/sections/Page';
import Templates from '../design/sections/Templates';
import Workspace from '../design/sections/Workspace';

const SECTIONS = [
  { key: 'foundations', label: 'Foundations', group: 'Nền tảng', C: Foundations },
  { key: 'atoms', label: 'Atoms', group: 'Nền tảng', C: Atoms },
  { key: 'molecules', label: 'Molecules', group: 'Nền tảng', C: Molecules },
  { key: 'issue', label: 'Issue', group: 'Modules', C: Issue },
  { key: 'page', label: 'Page', group: 'Modules', C: Page },
  { key: 'file', label: 'File', group: 'Modules', C: File },
  { key: 'member', label: 'Member', group: 'Modules', C: Member },
  { key: 'workspace', label: 'Workspace', group: 'Modules', C: Workspace },
  { key: 'auth', label: 'Auth', group: 'Modules', C: Auth },
  { key: 'templates', label: 'Templates', group: 'Nền tảng', C: Templates },
];

const Page_ = styled('div')({ height: '100vh', position: 'relative', zIndex: 1 });
const Layout = styled('div')({ display: 'grid', gridTemplateColumns: '236px 1fr', height: '100%' });
const NavCol = styled('nav')({
  borderRight: '1px solid var(--border)',
  background: 'var(--surface-1)',
  padding: '18px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  overflowY: 'auto',
});
const Brand = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 8px 14px',
  fontWeight: 700,
  fontSize: 15,
});
const Diamond = styled('span')({
  width: 24,
  height: 24,
  borderRadius: 7,
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 800,
});
const NavGroup = styled('div')({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-lo)',
  padding: '14px 10px 6px',
});
const NavItem = styled('button', { shouldForwardProp: (p) => p !== 'active' })<{
  active?: boolean;
}>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 10px',
  borderRadius: 'var(--r-md)',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: 13.5,
  fontWeight: 500,
  background: active ? 'var(--surface-3)' : 'transparent',
  color: active ? 'var(--text-hi)' : 'var(--text-mid)',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  '&:hover': { background: 'var(--surface-2)', color: 'var(--text-hi)' },
}));
const Main = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: '100%',
});
const Head = styled('header')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 32px',
  borderBottom: '1px solid var(--border)',
  background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
  backdropFilter: 'blur(8px)',
});
const BackBtn = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 'var(--r-md)',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-mid)',
  cursor: 'pointer',
  '&:hover': { background: 'var(--surface-3)', color: 'var(--text-hi)' },
});
const Content = styled('div')({ flex: 1, overflowY: 'auto', padding: '32px 32px 120px' });
const Inner = styled('div')({ maxWidth: 920 });

export const DesignSystemScreen = ({ onBack }: { onBack?: () => void }) => {
  const [active, setActive] = useState('foundations');
  const current = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];
  const Section = current.C;
  let lastGroup = '';
  return (
    <Page_>
      <Layout>
        <NavCol>
          <Brand>
            <Diamond>◆</Diamond>
            Design System
          </Brand>
          {SECTIONS.map((s) => {
            const showGroup = s.group !== lastGroup;
            lastGroup = s.group;
            return (
              <div key={s.key}>
                {showGroup ? <NavGroup>{s.group}</NavGroup> : null}
                <NavItem active={s.key === active} onClick={() => setActive(s.key)}>
                  {s.label}
                </NavItem>
              </div>
            );
          })}
        </NavCol>
        <Main>
          <Head>
            {onBack ? (
              <BackBtn type="button" onClick={onBack} aria-label="Quay lại">
                <Icon name="back" size={18} />
              </BackBtn>
            ) : null}
            <div style={{ flex: 1 }}>
              <Text variant="h3" style={{ display: 'block' }}>
                Graphite Console
              </Text>
              <Text variant="muted">Atomic design system · {current.label}</Text>
            </div>
            <ThemeToggle />
          </Head>
          <Content>
            <Inner>
              <Section />
            </Inner>
          </Content>
        </Main>
      </Layout>
    </Page_>
  );
};
