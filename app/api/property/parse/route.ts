import { normalizeProperty } from '../../../../lib/normalize';
import type { Property } from '../../../../types/property';
import { fetchSmartyProperties } from '../../../../lib/smarty';
import { fetchSmartyProperty } from '../../../../lib/smartyProperty';
import { NextResponse } from 'next/server';
import { parseListing } from '../../../../lib/scraper';
import { mockProperties } from '../../../../app/data/mockProperties';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const qsUrl = url.searchParams.get('url');

    const body = await request.json();
    const raw = body?.raw ?? body;
    const parsed: Property = normalizeProperty(raw);

    // If a URL query param is provided, attempt to enrich via Smarty using parsed.address or the URL
    const addressToQuery = parsed.address || qsUrl || undefined;
    if (addressToQuery) {
      try {
        const smarty = await fetchSmartyProperties(addressToQuery);
        if (smarty) {
          // attach under a `smarty` property for consumers
          (parsed as any).smarty = smarty;
        }
      } catch (e) {
        // swallow errors from Smarty to keep endpoint stable
        console.warn('Smarty enrichment failed:', e);
      }
    }
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const address = searchParams.get('address');
    const mock = searchParams.get('mock') === 'true';

    // Direct address query mode (new functionality)
    if (address) {
      const property = await fetchSmartyProperty(address, mock);
      return NextResponse.json(property);
    }

    // mock mode (deterministic testing)
    if (mock) {
      const property = mockProperties[0];
      return NextResponse.json({ success: true, smarty: true, data: property, mode: 'mock' });
    }

    // live mode - URL scraping
    if (!url) return NextResponse.json({ error: 'Missing URL or address parameter' }, { status: 400 });

    const scraped = await parseListing(url);
    const smarty = scraped?.address ? await fetchSmartyProperties(scraped.address as string) : null;

    const result = normalizeProperty({ ...scraped, smarty });
    return NextResponse.json({ success: true, smarty: !!smarty, data: result, mode: 'live' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
