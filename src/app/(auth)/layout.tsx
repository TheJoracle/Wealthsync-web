import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
          {children}
        </div>
      </main>
    </div>
  );
}
