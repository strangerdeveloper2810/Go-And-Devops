import { CssBaseline, ThemeProvider } from '@mui/material';
import { GlobalStyles, createAppTheme } from '@pm-platform/design-system';
import { EmptyState } from '@pm-platform/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react';
import { AppShell } from './components/AppShell';
import { colorMode } from './lib/colorMode';
import { session } from './lib/session';
import { BoardScreen } from './screens/BoardScreen';
import { DesignSystemScreen } from './screens/DesignSystemScreen';
import { FilesScreen } from './screens/FilesScreen';
import { IssuesScreen } from './screens/IssuesScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MembersScreen } from './screens/MembersScreen';
import { PagesScreen } from './screens/PagesScreen';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const useAuthed = () =>
  useSyncExternalStore(
    session.subscribe,
    () => session.isAuthenticated(),
    () => false,
  );
const useColorMode = () =>
  useSyncExternalStore(colorMode.subscribe, colorMode.get, () => 'dark' as const);
const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const useHash = () =>
  useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => '',
  );

const TITLES: Record<string, string> = {
  board: 'Board',
  issues: 'Issues',
  pages: 'Pages',
  files: 'Files',
  members: 'Members',
};
const SCREENS: Record<string, () => ReactNode> = {
  board: () => <BoardScreen />,
  issues: () => <IssuesScreen />,
  pages: () => <PagesScreen />,
  files: () => <FilesScreen />,
  members: () => <MembersScreen />,
};

const Root = () => {
  const authed = useAuthed();
  const hash = useHash();
  const [nav, setNav] = useState('board');

  if (hash.startsWith('#design')) {
    return (
      <DesignSystemScreen
        onBack={() => {
          window.location.hash = '';
        }}
      />
    );
  }
  if (!authed) return <LoginScreen />;

  const render = SCREENS[nav];
  return (
    <AppShell
      active={nav}
      onNavigate={(k) => {
        if (k === 'design') {
          window.location.hash = 'design';
        } else {
          setNav(k);
        }
      }}
      title={TITLES[nav] ?? nav}
      crumb="Apollo"
      user="Ada Lovelace"
    >
      {render ? render() : <EmptyState title="Chưa có" description="Chọn mục ở sidebar." />}
    </AppShell>
  );
};

export const App = () => {
  const mode = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <Root />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
