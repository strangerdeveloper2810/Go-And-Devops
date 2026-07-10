import { styled } from '@mui/material/styles';
import DOMPurify from 'dompurify';

// Props presentational: HTML nội dung trang wiki (đã render sẵn từ backend).
export interface PageProseProps {
  html: string;
}

// Vùng nội dung "prose": typography đọc đẹp cả light/dark qua CSS var.
const Article = styled('article')({
  color: 'var(--text-hi)',
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  lineHeight: 1.7,
  '& h1': {
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    margin: '1.6em 0 0.5em',
    color: 'var(--text-hi)',
  },
  '& h2': {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    margin: '1.4em 0 0.4em',
    color: 'var(--text-hi)',
  },
  '& h3': { fontSize: 17, fontWeight: 600, margin: '1.2em 0 0.3em', color: 'var(--text-hi)' },
  '& p': { margin: '0 0 1em' },
  '& ul, & ol': { margin: '0 0 1em', paddingLeft: 24 },
  '& li': { margin: '0.25em 0' },
  '& a': {
    color: 'var(--accent)',
    textDecoration: 'none',
    borderBottom: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
  },
  '& a:hover': { borderBottomColor: 'var(--accent)' },
  '& code': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.88em',
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    padding: '1px 5px',
  },
  '& pre': {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: 14,
    margin: '0 0 1em',
    overflowX: 'auto',
  },
  '& pre code': { background: 'transparent', border: 'none', padding: 0, fontSize: 'inherit' },
  '& blockquote': {
    margin: '0 0 1em',
    padding: '4px 16px',
    borderLeft: '3px solid var(--border-strong)',
    color: 'var(--text-mid)',
  },
  '& strong': { fontWeight: 600, color: 'var(--text-hi)' },
  '& hr': { border: 'none', borderTop: '1px solid var(--border)', margin: '1.5em 0' },
  '& img': { maxWidth: '100%', borderRadius: 'var(--r-md)' },
  '& > :first-of-type': { marginTop: 0 },
  '& > :last-child': { marginBottom: 0 },
});

// CHỐNG XSS: bắt buộc sanitize HTML trước khi dangerouslySetInnerHTML.
export const PageProse = ({ html }: PageProseProps) => (
  <Article dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);
