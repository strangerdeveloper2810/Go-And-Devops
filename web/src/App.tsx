import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Container, Typography } from '@mui/material';
import { theme } from '@pm-platform/design-system';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s trước khi refetch
      retry: 1,                    // retry 1 lần khi lỗi
      refetchOnWindowFocus: false, // tắt refetch khi focus (dev-friendly)
    },
  },
});

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: '2rem', mb: 2 }}>
          PM Platform
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Frontend initialized. Ready to build.
        </Typography>
      </Container>
    </ThemeProvider>
  </QueryClientProvider>
);
