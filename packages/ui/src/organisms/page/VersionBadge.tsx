import { styled } from '@mui/material/styles';
import { Tag } from '../../atoms/Tag';

// Props presentational cho nhãn phiên bản trang (Confluence versioning).
export interface VersionBadgeProps {
  version: number;
}

// Kế thừa Tag (tone neutral) nhưng đổi sang mono cho hợp "v{n}".
const Mono = styled(Tag)({ fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' });

export const VersionBadge = ({ version }: VersionBadgeProps) => (
  <Mono tone="neutral">v{version}</Mono>
);
