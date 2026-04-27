'use client';

import { usePathname } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import { useLocale } from '@/lib/i18n/client';
import { setLocale } from '@/lib/i18n/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();

  async function switchTo(code: 'nl' | 'en') {
    const fd = new FormData();
    fd.set('locale', code);
    fd.set('back', pathname || '/dashboard');
    await setLocale(fd);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" title="Taal / Language" />
        }
      >
        <Globe className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ code, label, flag }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchTo(code)}
            className="flex items-center gap-2"
          >
            <span aria-hidden>{flag}</span>
            {label}
            {locale === code && <Check className="ml-auto size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
