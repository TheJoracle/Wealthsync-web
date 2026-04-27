'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { importTrading212Csv } from '@/app/transactions/import/actions';
import { Button } from '@/components/ui/button';

type Result = {
  inserted?: number;
  skipped?: number;
  total?: number;
  errors?: string[];
  error?: string;
};

export function CsvImporter() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setResult(null);
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const r = await importTrading212Csv(fd);
      setResult(r);
      if (!r.error) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label
        htmlFor="csv-file"
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center transition hover:bg-muted/50 cursor-pointer"
      >
        <Upload className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">
          {file ? file.name : 'Klik of sleep een CSV-bestand hierheen'}
        </span>
        <span className="text-xs text-muted-foreground">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB`
            : 'Trading 212 transaction-export, max 10 MB'}
        </span>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={!file || pending} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : <Upload />}
          Importeer transacties
        </Button>
        {file && !pending && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {result?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
          <p className="font-semibold text-primary">
            {result.inserted} nieuwe transactie{result.inserted === 1 ? '' : 's'} geïmporteerd
          </p>
          <p className="text-muted-foreground">
            {result.total} regels gelezen, {result.skipped} overgeslagen (duplicaten of onbekende rijen).
          </p>
          {result.errors && result.errors.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-destructive">
                {result.errors.length} fout{result.errors.length === 1 ? '' : 'en'} (eerste paar)
              </summary>
              <ul className="mt-1 list-disc pl-5 text-destructive">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  );
}
