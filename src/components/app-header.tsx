import Link from 'next/link';
import {
  BarChart3,
  Bell,
  Calculator,
  Coins,
  LogOut,
  PieChart,
  Plug,
  Receipt,
  Target,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

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

export function AppHeader({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-xl font-black text-transparent"
          >
            WealthSync
          </Link>
          <nav className="hidden flex-wrap items-center gap-1 lg:flex">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
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
        {/* Mobile nav (when desktop nav hidden) */}
        <nav className="flex w-full flex-wrap items-center gap-1 border-t border-border pt-3 lg:hidden">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
