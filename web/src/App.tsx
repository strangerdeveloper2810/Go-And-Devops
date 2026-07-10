import { ThemeProvider, CssBaseline, Container, Typography } from '@mui/material';
import { theme } from '@pm-platform/design-system';

export const App = () => (
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
);
