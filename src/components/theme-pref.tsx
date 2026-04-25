'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'dark' | 'light';

export function ThemePref() {
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
        Licht
      </Button>
      <Button
        type="button"
        variant={theme === 'dark' ? 'default' : 'outline'}
        onClick={() => setMode('dark')}
      >
        <Moon className="size-4" />
        Donker
      </Button>
    </div>
  );
}
