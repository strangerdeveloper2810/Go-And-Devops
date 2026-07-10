import { styled } from '@mui/material/styles';
import { Avatar } from '../atoms/Avatar';

const Row = styled('span')({ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 });
const Col = styled('span')({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  lineHeight: 1.25,
});
const Name = styled('span')({
  fontSize: 13,
  fontWeight: 550,
  color: 'var(--text-hi)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const Meta = styled('span')({
  fontSize: 11.5,
  color: 'var(--text-lo)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Avatar + tên (+ meta) — dùng cho assignee, member, mention.
export const UserChip = ({
  name,
  meta,
  size = 26,
}: { name: string; meta?: string; size?: number }) => (
  <Row>
    <Avatar name={name} size={size} />
    <Col>
      <Name>{name}</Name>
      {meta ? <Meta>{meta}</Meta> : null}
    </Col>
  </Row>
);
