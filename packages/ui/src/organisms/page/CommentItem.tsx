import { styled } from '@mui/material/styles';
import { Avatar } from '../../atoms/Avatar';

// Props presentational cho 1 bình luận dưới trang wiki.
export interface CommentItemProps {
  author: string;
  timeLabel: string; // vd '2 giờ trước'
  body: string;
}

// Bố cục: avatar trái · (tên + thời gian + nội dung) phải.
const Wrap = styled('div')({ display: 'flex', gap: 12, alignItems: 'flex-start' });
const Body = styled('div')({ flex: 1, minWidth: 0 });
const Head = styled('div')({ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 });
const Author = styled('span')({ fontSize: 13.5, fontWeight: 600, color: 'var(--text-hi)' });
const Time = styled('span')({ fontSize: 12, color: 'var(--text-lo)' });
const Content = styled('p')({
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: 'var(--text-mid)',
});

export const CommentItem = ({ author, timeLabel, body }: CommentItemProps) => (
  <Wrap>
    <Avatar name={author} size={30} />
    <Body>
      <Head>
        <Author>{author}</Author>
        <Time>{timeLabel}</Time>
      </Head>
      <Content>{body}</Content>
    </Body>
  </Wrap>
);
