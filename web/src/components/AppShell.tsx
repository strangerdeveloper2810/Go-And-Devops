import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const Shell = styled('div')({ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 });
const Main = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: '100%',
});
const Content = styled('div')({ flex: 1, overflow: 'auto', padding: '24px 28px' });

export const AppShell = ({
  active,
  onNavigate,
  title,
  crumb,
  user,
  onNew,
  children,
}: {
  active?: string;
  onNavigate?: (key: string) => void;
  title?: string;
  crumb?: string;
  user?: string;
  onNew?: () => void;
  children: ReactNode;
}) => (
  <Shell>
    <Sidebar active={active} onNavigate={onNavigate} user={user} workspace={crumb} />
    <Main>
      <Topbar title={title} crumb={crumb} user={user} onNew={onNew} />
      <Content>{children}</Content>
    </Main>
  </Shell>
);
