// GENERATED FILE — do not edit by hand.
// Regenerate with: npx tsx tools/ingest/fetchEcbRates.ts
import type { CurrencyCode } from '../../types';

/** Units of the target currency per 1 EUR. */
export const FX_RATES: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.1555,
  GBP: 0.85565,
  AUD: 1.6359,
  CAD: 1.6108,
  // Derived: ECB does not quote AED. USD rate x the fixed 3.6725 AED/USD peg.
  AED: 4.2436,
};

/** Quote date of the ECB reference rates above (YYYY-MM-DD). */
export const FX_AS_OF = '2026-08-10';

export const FX_SOURCE =
  'European Central Bank euro foreign exchange reference rates (free daily feed, no API key). AED derived via the fixed 3.6725 AED/USD peg.';
