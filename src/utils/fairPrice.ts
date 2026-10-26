/**
 * Fair-price maths from irish-property-compass.
 *
 * Band and verdict: `estimate_fair_price` (migration 20260418194930) and the
 * thresholds in `src/pages/FairPrice.tsx`.
 * Sale summaries: `useMarketStats` in `src/hooks/useProperties.ts`.
 * Asking-vs-sale: `formatPriceDiff` in `src/data/mockData.ts`.
 *
 * Compass multiplied a 24-month median €/m² by floor area, and only if fewer
 * than five local sales existed fell back to flat unsourced rates
 * (Dublin €5,500, Wicklow €4,500, everywhere else €3,500). This app has no
 * Property Price Register cache, so the live check uses a sourced benchmark
 * passed in by the caller. The unsourced rates are kept here so they can be
 * named and refused, not applied.
 */

export const COMPASS_UNSOURCED_FALLBACK_PPSM = {
  Dublin: 5500,
  Wicklow: 4500,
  other: 3500,
} as const;

/** Compass fair band: 8% under and over the median €/m² × floor area. */
export const FAIR_BAND_LOW_FACTOR = 0.92;
export const FAIR_BAND_HIGH_FACTOR = 1.08;

/**
 * Asking vs mid estimate, in percent. Compass (`FairPrice.tsx`):
 *   < -8 underpriced, <= 5 fair, <= 15 above market, else overpriced.
 */
export const VERDICT_BELOW_MAX = -8;
export const VERDICT_FAIR_MAX = 5;
export const VERDICT_ABOVE_MAX = 15;

/** Compass refused a check under this floor area. */
export const MIN_GRADE_SQM = 30;

/** Compass refused an asking price under this. */
export const MIN_ASKING_PRICE_EUR = 50_000;

export type FairVerdict = 'below' | 'fair' | 'above' | 'overpriced';

export const VERDICT_COPY: Record<FairVerdict, { label: string; text: string }> = {
  below: {
    label: 'Underpriced',
    text: 'This looks like a strong deal — well below the local benchmark for this floor area.',
  },
  fair: {
    label: 'Fair Price',
    text: 'This price sits inside the fair band around the local €/m² benchmark.',
  },
  above: {
    label: 'Above Market',
    text: 'Slightly above the local benchmark. There may be premium features justifying it — verify in person.',
  },
  overpriced: {
    label: 'Overpriced',
    text: 'This is materially above the local benchmark. Negotiate hard, or walk away.',
  },
};

export interface FairBand {
  low: number;
  mid: number;
  high: number;
}

/** `ROUND(ppsm * sqm * factor)` from `estimate_fair_price`. `sqm` is an integer there. */
export function estimateFairBand(medianPpsm: number, sqm: number): FairBand {
  const area = Math.round(sqm);
  return {
    low: Math.round(medianPpsm * area * FAIR_BAND_LOW_FACTOR),
    mid: Math.round(medianPpsm * area),
    high: Math.round(medianPpsm * area * FAIR_BAND_HIGH_FACTOR),
  };
}

export function deltaPercent(askingPrice: number, midEstimate: number): number {
  return ((askingPrice - midEstimate) / midEstimate) * 100;
}

export function verdictForDelta(deltaPct: number): FairVerdict {
  if (deltaPct < VERDICT_BELOW_MAX) return 'below';
  if (deltaPct <= VERDICT_FAIR_MAX) return 'fair';
  if (deltaPct <= VERDICT_ABOVE_MAX) return 'above';
  return 'overpriced';
}

/**
 * Sale minus asking, as a percent of asking. Port of `formatPriceDiff`.
 * Positive means the sale cleared above the asking price.
 */
export function askingVsSalePercent(asking: number, sale: number): number {
  return ((sale - asking) / asking) * 100;
}

export function formatEuro(price: number): string {
  return '€' + Math.round(price).toLocaleString('en-IE');
}

export interface SaleLike {
  price: number;
  floorArea?: number | null;
}

/**
 * Upper-middle median used by `useMarketStats` (`prices[floor(n/2)]` on a
 * sorted ascending list). Not the interpolated SQL percentile.
 */
export function upperMiddleMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * PostgreSQL `percentile_cont(0.5)` — the median `estimate_fair_price` uses.
 * Even counts are the mean of the two central values.
 */
export function percentileCont50(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface MarketStats {
  avgPrice: number;
  medianPrice: number;
  avgPricePerSqm: number;
  totalSales: number;
}

/** Port of `useMarketStats`. Floor area must be over 30 m² to enter the €/m² mean. */
export function summariseSales(sales: SaleLike[]): MarketStats {
  if (sales.length === 0) {
    return { avgPrice: 0, medianPrice: 0, avgPricePerSqm: 0, totalSales: 0 };
  }

  const prices = sales.map((s) => s.price);
  const avgPrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / sales.length);
  const medianPrice = upperMiddleMedian(prices) ?? 0;

  const withArea = sales.filter((s) => s.floorArea != null && s.floorArea > MIN_GRADE_SQM);
  const avgPricePerSqm = withArea.length
    ? Math.round(
        withArea.reduce((sum, sale) => sum + sale.price / (sale.floorArea as number), 0) / withArea.length
      )
    : 0;

  return { avgPrice, medianPrice, avgPricePerSqm, totalSales: sales.length };
}

/**
 * Median €/m² the SQL estimator would use when every sale has a floor area.
 * Sales at or under 30 m² are dropped, matching the `floor_area > 30` filter.
 */
export function medianPricePerSqm(sales: SaleLike[]): { medianPpsm: number | null; compCount: number } {
  const usable = sales.filter((s) => s.floorArea != null && s.floorArea > MIN_GRADE_SQM);
  const ratios = usable.map((s) => s.price / (s.floorArea as number));
  return { medianPpsm: percentileCont50(ratios), compCount: usable.length };
}
