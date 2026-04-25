'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updateEmail } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(currentEmail);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const r = await updateEmail(fd);
      if (r?.error) setError(r.error);
      else if (r?.message) setInfo(r.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-email">Email-adres</Label>
        <Input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
          {info}
        </div>
      )}
      <Button
        type="submit"
        disabled={pending || email === currentEmail}
        className="self-start"
      >
        {pending && <Loader2 className="animate-spin" />}
        Email wijzigen
      </Button>
    </form>
  );
}
