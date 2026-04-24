'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || 'dark';
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('wealthsync-theme', next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
