export interface Property {
  address: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  hoa: number;
  tax_rate: number;
  est_rent: number;
  year_built: number | null;
}
