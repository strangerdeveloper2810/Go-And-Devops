import { styled } from '@mui/material/styles';
import { Icon } from '@pm-platform/ui';
import { useSyncExternalStore } from 'react';
import { colorMode } from '../lib/colorMode';

const Btn = styled('button')({
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
  transition:
    'background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  '&:hover': {
    background: 'var(--surface-3)',
    color: 'var(--text-hi)',
    borderColor: 'var(--border-strong)',
  },
});

export const ThemeToggle = () => {
  const mode = useSyncExternalStore(colorMode.subscribe, colorMode.get, () => 'dark' as const);
  return (
    <Btn
      type="button"
      onClick={colorMode.toggle}
      aria-label="Đổi giao diện sáng/tối"
      title={mode === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
    >
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={17} />
    </Btn>
  );
};
