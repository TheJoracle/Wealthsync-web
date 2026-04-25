'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updatePassword } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const r = await updatePassword(fd);
      if (r?.error) setError(r.error);
      else if (r?.message) {
        setInfo(r.message);
        setPassword('');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">Nieuw wachtwoord</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Minimaal 8 tekens.</p>
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
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Loader2 className="animate-spin" />}
        Wachtwoord wijzigen
      </Button>
    </form>
  );
}
