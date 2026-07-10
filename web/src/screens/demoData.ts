import type { BoardColumn } from '@pm-platform/ui';

// Dữ liệu demo presentational cho board (design system — không dính model backend).
export const demoColumns: BoardColumn[] = [
  {
    key: 'todo',
    label: 'Backlog',
    color: 'var(--text-lo)',
    items: [
      {
        id: 1,
        issueKey: 'APOLLO-12',
        summary: 'JWT auth middleware chặn request chưa verify',
        priority: 'high',
        labels: ['auth', 'gateway'],
        assigneeName: 'Ada Lovelace',
      },
      {
        id: 2,
        issueKey: 'APOLLO-15',
        summary: 'Rate limit theo IP ở gateway',
        priority: 'medium',
        labels: ['gateway'],
        assigneeName: 'Leo Turing',
      },
    ],
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: 'var(--blue)',
    items: [
      {
        id: 3,
        issueKey: 'APOLLO-9',
        summary: 'Kéo-thả card giữa các cột board',
        priority: 'high',
        labels: ['board', 'ux'],
        assigneeName: 'Grace Hopper',
      },
      {
        id: 4,
        issueKey: 'APOLLO-7',
        summary: 'Kafka consumer idempotent cho projection',
        priority: 'highest',
        labels: ['kafka'],
        assigneeName: 'Ada Lovelace',
      },
    ],
  },
  {
    key: 'in_review',
    label: 'In Review',
    color: 'var(--violet)',
    items: [
      {
        id: 5,
        issueKey: 'APOLLO-5',
        summary: 'Editor trang wiki + sanitize HTML',
        priority: 'medium',
        labels: ['page'],
        assigneeName: 'Leo Turing',
      },
    ],
  },
  {
    key: 'done',
    label: 'Done',
    color: 'var(--green)',
    items: [
      {
        id: 6,
        issueKey: 'APOLLO-3',
        summary: 'Màn đăng nhập + lưu token',
        priority: 'low',
        assigneeName: 'Grace Hopper',
      },
      {
        id: 7,
        issueKey: 'APOLLO-2',
        summary: 'Upload file qua MinIO (giới hạn size)',
        priority: 'medium',
        labels: ['file'],
        assigneeName: 'Ada Lovelace',
      },
    ],
  },
];
