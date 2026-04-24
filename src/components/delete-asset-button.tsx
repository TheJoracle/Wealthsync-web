'use client';

import { useTransition } from 'react';
import { deleteAsset } from '@/app/assets/actions';

export function DeleteAssetButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`"${name}" verwijderen? Dit verwijdert ook de prijsgeschiedenis van dit asset.`)) {
      return;
    }
    startTransition(async () => {
      await deleteAsset(id);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      {pending ? '...' : 'Verwijder'}
    </button>
  );
}
