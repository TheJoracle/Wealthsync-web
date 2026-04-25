'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAsset } from '@/app/assets/actions';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DeleteAssetButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      await deleteAsset(id);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        disabled={pending}
        title="Verwijder"
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Asset verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            "{name}" wordt verwijderd inclusief de bijhorende prijsgeschiedenis. Deze actie kan niet ongedaan gemaakt worden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? 'Bezig...' : 'Verwijder'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
