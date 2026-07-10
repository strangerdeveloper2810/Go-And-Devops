import { styled } from '@mui/material/styles';
import { AuthLayout, AuthPanel, Button, TextField } from '@pm-platform/ui';
import { type FormEvent, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useLogin } from '../features/auth';

const Form = styled('form')({ display: 'flex', flexDirection: 'column', gap: 14 });
const ErrorText = styled('div')({ fontSize: 12.5, color: 'var(--red)' });
const DesignLink = styled('a')({
  display: 'block',
  marginTop: 8,
  fontSize: 12.5,
  color: 'var(--text-mid)',
  cursor: 'pointer',
  '&:hover': { color: 'var(--text-hi)' },
});

// Màn đăng nhập — dựng từ organism AuthLayout + AuthPanel của design system.
export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthLayout topRight={<ThemeToggle />}>
      <AuthPanel
        title="Welcome back"
        subtitle="Đăng nhập để tiếp tục vào workspace."
        footer={
          <>
            Chưa có tài khoản? Liên hệ admin workspace.
            <DesignLink href="#design">Xem Design System →</DesignLink>
          </>
        }
      >
        <Form onSubmit={submit}>
          <TextField
            label="Email"
            type="email"
            placeholder="you@team.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {login.isError ? <ErrorText>{(login.error as Error).message}</ErrorText> : null}
          <Button variant="primary" type="submit" fullWidth disabled={login.isPending}>
            {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </Form>
      </AuthPanel>
    </AuthLayout>
  );
};
