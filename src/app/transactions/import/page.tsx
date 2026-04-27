import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CsvImporter } from '@/components/csv-importer';

export const metadata = { title: 'CSV-import — WealthSync' };

export default async function CsvImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">CSV-import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload een Trading 212 transactie-export. Werkt ook voor andere brokers met dezelfde kolom-conventies.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trading 212 export</CardTitle>
            <p className="text-sm text-muted-foreground">
              In Trading 212: <strong>Settings → Account → History</strong> → "Export to CSV". Upload het
              bestand hieronder.
            </p>
          </CardHeader>
          <CardContent>
            <CsvImporter />
          </CardContent>
        </Card>

        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Wat we doen</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>· Aankopen, verkopen, dividenden, stortingen en opnames worden geïmporteerd.</li>
              <li>· Tickers worden gekoppeld aan bestaande assets (op symbool, zonder distributie-suffix).</li>
              <li>· Dubbele rijen worden overgeslagen op basis van de Trading 212 transactie-ID.</li>
              <li>· Na import draait FIFO opnieuw → cost basis op je dashboard wordt vernieuwd.</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
