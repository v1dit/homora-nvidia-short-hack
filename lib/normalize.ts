import type { Property } from '../types/property';

export function normalizeProperty(raw: any): Property {
  const normalized: any = {
    id: String(raw?.id ?? raw?.url ?? Date.now()),
    title: raw?.title ?? raw?.name ?? 'Untitled property',
    price: raw?.price !== undefined ? (typeof raw.price === 'number' ? raw.price : Number(raw.price)) : undefined,
    description: raw?.description ?? raw?.desc ?? '',
    address: raw?.address ?? '',
    features: Array.isArray(raw?.features) ? raw.features : (raw?.features ? [String(raw.features)] : []),
    url: raw?.url ?? '',
    fetchedAt: raw?.fetchedAt ?? new Date().toISOString(),
    // pass-through optional helpers
    monthlyRent: raw?.monthlyRent ?? raw?.est_rent ?? raw?.estRent ?? null,
    est_rent: raw?.est_rent ?? raw?.estRent ?? null,
  };

  // Quick mapping: if monthlyRent missing but est_rent exists, use it
  if (!normalized.monthlyRent && normalized.est_rent) {
    normalized.monthlyRent = normalized.est_rent;
  }

  return normalized as Property;
}
