import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Track your portfolio
          </h2>
          <p className="mt-6 text-lg text-[var(--text-secondary)]">
            Next.js + Supabase rewrite — under construction.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
              <p className="text-sm text-[var(--text-muted)]">
                Dark/light toggle works — click the icon top-right.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
