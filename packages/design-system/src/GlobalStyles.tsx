import { Global, css } from '@emotion/react';

// Inject font (Geist / Geist Mono) + CSS variables cho 2 mode. Mặc định (:root) = dark;
// [data-theme='light'] override. App set data-theme lên <html> khi toggle.
export const GlobalStyles = () => (
  <Global
    styles={css`
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

      :root {
        --surface-1: #141418;
        --surface-2: #1a1a20;
        --surface-3: #22222b;
        --bg: #0e0e11;
        --border: rgba(255, 255, 255, 0.08);
        --border-strong: rgba(255, 255, 255, 0.15);
        --text-hi: #ececee;
        --text-mid: #9a9aa4;
        --text-lo: #63636d;
        --accent: #c6f24e;
        --accent-dim: rgba(198, 242, 78, 0.14);
        --accent-contrast: #0e0e11;
        --red: #f0616d;
        --amber: #e8b44a;
        --blue: #5b9df9;
        --green: #57c98a;
        --violet: #a78bfa;
        --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
        --shadow-2: 0 8px 30px rgba(0, 0, 0, 0.5);
        --glow: rgba(198, 242, 78, 0.05);
        --r-sm: 6px;
        --r-md: 8px;
        --r-lg: 12px;
        --r-pill: 999px;
        --font-sans: 'Geist', -apple-system, 'Segoe UI', system-ui, sans-serif;
        --font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
        --ease: cubic-bezier(0.16, 1, 0.3, 1);
        --dur: 150ms;
      }

      [data-theme='light'] {
        --bg: #fbfbfa;
        --surface-1: #ffffff;
        --surface-2: #ffffff;
        --surface-3: #f1f1ef;
        --border: rgba(0, 0, 0, 0.09);
        --border-strong: rgba(0, 0, 0, 0.17);
        --text-hi: #1a1a17;
        --text-mid: #5f5f66;
        --text-lo: #9a9aa2;
        --accent-dim: rgba(163, 214, 54, 0.22);
        --red: #dc4c51;
        --amber: #b27a16;
        --blue: #2f6fe0;
        --green: #2e9e68;
        --violet: #7350e0;
        --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.06);
        --shadow-2: 0 10px 34px rgba(0, 0, 0, 0.1);
        --glow: rgba(198, 242, 78, 0.12);
      }

      * {
        box-sizing: border-box;
      }
      html,
      body,
      #root {
        height: 100%;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text-hi);
        font-family: var(--font-sans);
        font-size: 14px;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
      }
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(60rem 40rem at -10% -10%, var(--glow), transparent 60%);
        z-index: 0;
      }
      ::selection {
        background: var(--accent);
        color: var(--accent-contrast);
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-thumb {
        background: var(--border-strong);
        border-radius: 999px;
        border: 2px solid var(--bg);
      }
    `}
  />
);
