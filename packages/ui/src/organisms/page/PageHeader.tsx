import { styled } from '@mui/material/styles';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';

// Props presentational cho header 1 trang wiki.
export interface PageHeaderProps {
  title: string;
  space?: string; // tên space (breadcrumb)
  updatedLabel?: string; // vd 'Updated 2h ago by An'
}

const Wrap = styled('header')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingBottom: 16,
  marginBottom: 20,
  borderBottom: '1px solid var(--border)',
});
const Crumb = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: 'var(--text-lo)',
});
const Meta = styled('div')({ fontSize: 12, color: 'var(--text-lo)' });

export const PageHeader = ({ title, space, updatedLabel }: PageHeaderProps) => (
  <Wrap>
    {space ? (
      <Crumb>
        <Icon name="doc" size={13} />
        <span>{space}</span>
      </Crumb>
    ) : null}
    <Text as="h1" variant="h1">
      {title}
    </Text>
    {updatedLabel ? <Meta>{updatedLabel}</Meta> : null}
  </Wrap>
);
