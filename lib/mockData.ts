import type { Property } from '../types/property';

export const mockProperties: Property[] = [
  {
    id: 'mock-1',
    title: 'Charming 2BR in Downtown',
    price: 350000,
    description: 'Bright 2 bedroom apartment within walking distance to shops and transit.',
    address: '123 Main St, Springfield, CA',
    features: ['2 beds', '1 bath', '750 sqft'],
    url: 'https://example.com/listings/mock-1',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Modern Studio with Views',
    price: 220000,
    description: 'Studio with city views and modern finishes.',
    address: '456 Market St, Metropolis, NY',
    features: ['Studio', '1 bath', '450 sqft'],
    url: 'https://example.com/listings/mock-2',
    fetchedAt: new Date().toISOString(),
  },
];
