import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';
import { Surface } from '../../atoms/Surface';
import { Tag } from '../../atoms/Tag';

export type WorkspaceCardProps = {
  name: string;
  plan?: string;
  memberCount?: number;
  onClick?: () => void;
};

// Suy tone màu cho plan tag: gói trả phí (pro/business/enterprise) nổi bật accent, free trung tính.
const planTone = (plan: string) => {
  const p = plan.toLowerCase();
  if (p.includes('enterprise')) return 'violet' as const;
  if (p.includes('pro') || p.includes('business') || p.includes('team')) return 'accent' as const;
  return 'neutral' as const;
};

const Inner = styled('div')({ padding: 14, display: 'flex', alignItems: 'center', gap: 12 });
const Meta = styled('div')({
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});
const TopRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 });
const Name = styled('div')({
  fontSize: 14.5,
  fontWeight: 600,
  color: 'var(--text-hi)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const Members = styled('div')({ fontSize: 12.5, color: 'var(--text-lo)' });

// Thẻ workspace: avatar (màu suy từ tên) + tên + tag gói + số thành viên. Presentational, click optional.
export const WorkspaceCard = ({ name, plan, memberCount, onClick }: WorkspaceCardProps) => (
  <Surface interactive={onClick != null} onClick={onClick}>
    <Inner>
      <Avatar name={name} size={40} />
      <Meta>
        <TopRow>
          <Name title={name}>{name}</Name>
          {plan ? <Tag tone={planTone(plan)}>{plan}</Tag> : null}
        </TopRow>
        <Members>{memberCount ?? 0} thành viên</Members>
      </Meta>
    </Inner>
  </Surface>
);
