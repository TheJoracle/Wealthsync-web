'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';

type Theme = 'dark' | 'light';

export function ThemePref() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function setMode(mode: Theme) {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem('wealthsync-theme', mode);
    } catch {}
    setTheme(mode);
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={theme === 'light' ? 'default' : 'outline'}
        onClick={() => setMode('light')}
      >
        <Sun className="size-4" />
        {t('settings.theme.light')}
      </Button>
      <Button
        type="button"
        variant={theme === 'dark' ? 'default' : 'outline'}
        onClick={() => setMode('dark')}
      >
        <Moon className="size-4" />
        {t('settings.theme.dark')}
      </Button>
    </div>
  );
}
