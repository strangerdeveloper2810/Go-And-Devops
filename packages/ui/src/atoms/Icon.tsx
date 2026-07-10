import type { ReactNode } from 'react';

export type IconName =
  | 'board'
  | 'doc'
  | 'file'
  | 'users'
  | 'search'
  | 'plus'
  | 'logout'
  | 'chevron'
  | 'settings'
  | 'inbox'
  | 'check'
  | 'clock'
  | 'sun'
  | 'moon'
  | 'palette'
  | 'back';

const P: Record<IconName, ReactNode> = {
  board: (
    <>
      <path d="M4 4h6v16H4z" />
      <path d="M14 4h6v10h-6z" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M4 12V5h16v7" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 15.2c2 .3 4 2 4 4.8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M14 4H6v16h8" />
      <path d="M18 12H10M15 9l3 3-3 3" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  check: <path d="M5 12l5 5L20 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />,
  palette: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.5" cy="10" r="1" />
      <circle cx="12" cy="8" r="1" />
      <circle cx="15.5" cy="10" r="1" />
      <path d="M12 21c2 0 2-2 3-2s3 1 3-2" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
};

// Line-icon (stroke, currentColor) — hợp thẩm mỹ console.
export const Icon = ({ name, size = 18 }: { name: IconName; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {P[name]}
  </svg>
);
