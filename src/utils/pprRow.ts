/**
 * One-row parser for a Property Price Register CSV line.
 *
 * Ported from the positional reading in irish-property-compass
 * `supabase/functions/sync-ppr/index.ts`. The official register is published
 * by the Property Services Regulatory Authority; Compass read a Smart Dublin
 * mirror of the yearly CSV (ISO-8859-1, header skipped by the caller).
 *
 * Columns, in order:
 *   0 date, 1 address, 2 county, 3 eircode, 4 price,
 *   5 not full market price, 6 VAT exclusive, 7 description, 8 size description.
 *
 * The edge function kept only Dublin and Wicklow. This parser does not —
 * that filter was a sync policy, not a fact about the file.
 */

import { extractRoutingKey } from './eircode';

export interface PprSaleRow {
  dateOfSale: string;
  address: string;
  county: string;
  eircode: string | null;
  price: number;
  notFullMarketPrice: string;
  vatExclusive: string;
  description: string;
  propertySizeDescription: string;
  /**
   * Compass took the first three characters of the Eircode when present
   * (`"D6W AB12"` → `"D6W"`, `"D06 Y2K3"` → `"D06"`), otherwise the first
   * routing-key-shaped token in the address. `D6` / `D12` (one or two digits)
   * are accepted here, which the stricter `extractRoutingKey` helper is not.
   */
  routingKey: string | null;
}

function routingKeyFromPprFields(address: string, eircode: string | null): string | null {
  if (eircode && eircode.length >= 3) {
    return eircode.substring(0, 3).toUpperCase().replace(/\s/g, '');
  }
  const match = address.match(/\b(D6W|D\d{1,2}|[A-Z]\d{2})\b/i);
  return match ? match[1].toUpperCase() : extractRoutingKey(address);
}

/** `null` when the row is too short, undated, or has no positive price. */
export function parsePprRow(row: readonly string[]): PprSaleRow | null {
  if (!row || row.length < 5) return null;

  const dateStr = (row[0] ?? '').trim();
  const dParts = dateStr.split(/[\s/]+/);
  if (dParts.length !== 3) return null;
  const dateOfSale = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfSale)) return null;

  const price = parseFloat((row[4] ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(price) || price <= 0) return null;

  const address = (row[1] ?? '').trim();
  const eircode = (row[3] ?? '').trim() || null;

  return {
    dateOfSale,
    address,
    county: (row[2] ?? '').trim(),
    eircode,
    price,
    notFullMarketPrice: (row[5] ?? '').trim(),
    vatExclusive: (row[6] ?? '').trim(),
    description: (row[7] ?? '').trim(),
    propertySizeDescription: (row[8] ?? '').trim(),
    routingKey: routingKeyFromPprFields(address, eircode),
  };
}
