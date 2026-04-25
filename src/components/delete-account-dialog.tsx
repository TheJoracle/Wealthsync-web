'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAccount } from '@/app/account/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DeleteAccountDialog({ userEmail }: { userEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const r = await deleteAccount();
      if (r?.error) setError(r.error);
      // Successful delete redirects to /login, so we won't reach here
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className={buttonVariants({ variant: 'destructive', size: 'lg' })}
      >
        <Trash2 className="size-4" />
        Account verwijderen
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account permanent verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            Dit verwijdert je account én alle bijbehorende data: assets, transacties, dividenden,
            doelen, alerts, broker-connecties en historie. Niet ongedaan te maken.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-email">
            Typ <strong className="font-mono">{userEmail}</strong> om te bevestigen
          </Label>
          <Input
            id="confirm-email"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={userEmail}
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="destructive"
            disabled={pending || confirm !== userEmail}
            onClick={onConfirm}
          >
            {pending ? 'Bezig met verwijderen...' : 'Definitief verwijder'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
