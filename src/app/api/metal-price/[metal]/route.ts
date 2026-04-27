import { NextResponse, type NextRequest } from 'next/server';
import { fetchPhysicalMetalPricePerGram } from '@/lib/prices';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ metal: string }> },
) {
  const { metal } = await params;
  const pricePerGram = await fetchPhysicalMetalPricePerGram(metal.toUpperCase());
  if (pricePerGram === null) {
    return NextResponse.json(
      { error: `Could not fetch price for ${metal}` },
      { status: 502 },
    );
  }
  return NextResponse.json({
    metal: metal.toUpperCase(),
    price_eur_per_gram: pricePerGram,
  });
}
