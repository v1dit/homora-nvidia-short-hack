import type { Property } from '../types/property';

export function normalizeProperty(raw: any): Property {
  return {
    id: String(raw?.id ?? raw?.url ?? Date.now()),
    title: raw?.title ?? raw?.name ?? 'Untitled property',
    price: raw?.price !== undefined ? (typeof raw.price === 'number' ? raw.price : Number(raw.price)) : undefined,
    description: raw?.description ?? raw?.desc ?? '',
    address: raw?.address ?? '',
    features: Array.isArray(raw?.features) ? raw.features : (raw?.features ? [String(raw.features)] : []),
    url: raw?.url ?? '',
    fetchedAt: raw?.fetchedAt ?? new Date().toISOString(),
  };
}
