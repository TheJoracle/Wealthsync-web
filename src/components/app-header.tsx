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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: BarChart3 },
  { href: '/charts', label: 'Charts', Icon: PieChart },
  { href: '/transactions', label: 'Transacties', Icon: Receipt },
  { href: '/dividends', label: 'Dividenden', Icon: Coins },
  { href: '/goals', label: 'Doelen', Icon: Target },
  { href: '/tax', label: 'Belasting', Icon: Calculator },
  { href: '/alerts', label: 'Alerts', Icon: Bell },
  { href: '/connections', label: 'Connecties', Icon: Plug },
] as const;

const ACCOUNT_ITEMS = [
  { href: '/settings', label: 'Instellingen', Icon: Settings },
  { href: '/account', label: 'Account', Icon: User },
] as const;

export function AppHeader({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
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
              {current.label}
              <ChevronDown className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {NAV_ITEMS.map(({ href, label, Icon }) => (
                <DropdownMenuItem key={href} render={<Link href={href} />}>
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {ACCOUNT_ITEMS.map(({ href, label, Icon }) => (
                <DropdownMenuItem key={href} render={<Link href={href} />}>
                  <Icon className="size-4" />
                  {label}
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
            <Button type="submit" variant="ghost" size="icon" title="Uitloggen">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
