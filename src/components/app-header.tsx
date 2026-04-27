'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Calculator,
  ChevronDown,
  Coins,
  LogOut,
  PieChart,
  Plug,
  Receipt,
  Settings,
  Target,
  User,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/dictionaries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'nav.dashboard' as MessageKey, Icon: BarChart3 },
  { href: '/charts', key: 'nav.charts' as MessageKey, Icon: PieChart },
  { href: '/transactions', key: 'nav.transactions' as MessageKey, Icon: Receipt },
  { href: '/dividends', key: 'nav.dividends' as MessageKey, Icon: Coins },
  { href: '/goals', key: 'nav.goals' as MessageKey, Icon: Target },
  { href: '/tax', key: 'nav.tax' as MessageKey, Icon: Calculator },
  { href: '/alerts', key: 'nav.alerts' as MessageKey, Icon: Bell },
  { href: '/connections', key: 'nav.connections' as MessageKey, Icon: Plug },
] as const;

const ACCOUNT_ITEMS = [
  { href: '/settings', key: 'nav.settings' as MessageKey, Icon: Settings },
  { href: '/account', key: 'nav.account' as MessageKey, Icon: User },
] as const;

export function AppHeader({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const t = useT();
  const allItems = [...NAV_ITEMS, ...ACCOUNT_ITEMS];
  const current =
    allItems.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)) ??
    NAV_ITEMS[0];
  const CurrentIcon = current.Icon;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-xl font-black text-transparent"
          >
            WealthSync
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <CurrentIcon className="size-4" />
              {t(current.key)}
              <ChevronDown className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {NAV_ITEMS.map(({ href, key, Icon }) => (
                <DropdownMenuItem key={href} render={<Link href={href} />}>
                  <Icon className="size-4" />
                  {t(key)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {ACCOUNT_ITEMS.map(({ href, key, Icon }) => (
                <DropdownMenuItem key={href} render={<Link href={href} />}>
                  <Icon className="size-4" />
                  {t(key)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
          )}
          <ThemeToggle />
          <form action="/logout" method="post">
            <Button type="submit" variant="ghost" size="icon" title={t('nav.logout')}>
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
