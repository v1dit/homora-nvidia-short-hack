import { Property } from '../types/property';

/**
 * Transforms raw Smarty API JSON into a normalized Property shape.
 * Returns null if data is missing or malformed.
 */
export function transformSmartyResponse(data: any): Property | null {
  const p = data?.[0]?.property;
  if (!p) return null;

  return {
    address: data?.[0]?.address?.formatted ?? 'Unknown',
    price: 0, // placeholder — filled later by scraper or MLS
    sqft: p.area?.structure ?? 0,
    beds: p.building?.rooms?.beds ?? 0,
    baths: p.building?.rooms?.baths ?? 0,
    hoa: 0,
    tax_rate: p.assessments?.[0]?.tax_rate ?? 1.1,
    est_rent: 0,
    year_built: p.year_built ?? null,
  };
}
