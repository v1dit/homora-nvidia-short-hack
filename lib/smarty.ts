import axios from 'axios';

/**
 * Represents a single property record returned by Smarty.
 */
export interface SmartyProperty {
  zoning?: string;
  tax_rate?: number;
  year_built?: number | null;
  lot_size?: number | null;
  risk?: string | null;
}

/**
 * Fetch property data from the Smarty US Property Data API.
 * Supports both:
 * - SMARTY_KEY (Bearer)
 * - SMARTY_AUTH_ID + SMARTY_AUTH_TOKEN (Basic via query params)
 */
export async function fetchSmartyProperties(
  address: string
): Promise<SmartyProperty | null> {
  const BASE_URL = 'https://property.api.smarty.com/v1/properties';

  try {
    const headers: Record<string, string> = {};
    const params: Record<string, string> = { street: address };

    // ✅ Support both Bearer and Basic auth
    if (process.env.SMARTY_KEY) {
      headers['Authorization'] = `Bearer ${process.env.SMARTY_KEY}`;
    } else if (
      process.env.SMARTY_AUTH_ID &&
      process.env.SMARTY_AUTH_TOKEN
    ) {
      params['auth-id'] = process.env.SMARTY_AUTH_ID;
      params['auth-token'] = process.env.SMARTY_AUTH_TOKEN;
    } else {
      throw new Error('Missing Smarty credentials in environment variables.');
    }

    const { data } = await axios.get(BASE_URL, { headers, params });
    const p = data?.[0]?.property ?? {};

    return {
      zoning: p.zoning ?? 'N/A',
      tax_rate: p.assessments?.[0]?.tax_rate ?? 1.1,
      year_built: p.year_built ?? null,
      lot_size: p.area?.lot ?? null,
      risk: p.risk ?? null,
    };
  } catch (err) {
    console.error('❌ Smarty API Error:', err);
    return null;
  }
}
