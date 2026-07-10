import { Tag, type Tone } from '../../atoms/Tag';

const MAP: Record<string, { label: string; tone: Tone }> = {
  todo: { label: 'Backlog', tone: 'neutral' },
  backlog: { label: 'Backlog', tone: 'neutral' },
  in_progress: { label: 'In Progress', tone: 'blue' },
  in_review: { label: 'In Review', tone: 'violet' },
  done: { label: 'Done', tone: 'green' },
};

// Nhãn trạng thái workflow issue.
export const StatusPill = ({ status }: { status: string }) => {
  const s = MAP[status.toLowerCase()] ?? { label: status, tone: 'neutral' as Tone };
  return <Tag tone={s.tone}>{s.label}</Tag>;
};
