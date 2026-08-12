/**
 * Cache bucketing for proof listings.
 *
 * The naive key — (city, kind, zone, beds, budget) — yields roughly
 * 25 x 4 x 5 x 5 x 22 = 55,000 buckets. At any realistic traffic level most stay
 * cold forever, which quietly reintroduces the per-user cost the cache exists to
 * remove.
 *
 * So: FETCH COARSE, FILTER FINE. Key on city + beds + a geometric budget band,
 * over-fetch a page of listings, and narrow by kind and zone on the client. That
 * is ~2,750 buckets, with a realistic head far smaller than that — and 4 presets
 * x 25 cities = 100 buckets covers most of a viral session, because most visitors
 * click a preset rather than typing.
 */
import type { ProofQuery } from './types';

/** Band width. 1.15 keeps a band about 15% wide — tight enough to be relevant. */
export const BAND_RATIO = 1.15;

export const MIN_BUDGET_EUR = 50_000;

export function budgetBandIndex(budgetEur: number): number {
  const clamped = Math.max(MIN_BUDGET_EUR, budgetEur);
  return Math.floor(Math.log(clamped) / Math.log(BAND_RATIO));
}

export type BedsBucket = '1' | '2' | '3' | '4plus' | 'any';

export function bedsBucket(beds?: number): BedsBucket {
  if (beds == null || !Number.isFinite(beds)) return 'any';
  if (beds >= 4) return '4plus';
  if (beds <= 1) return '1';
  return String(beds) as '2' | '3';
}

/**
 * The cache key. Deliberately excludes kind and zone: including them multiplies
 * the bucket count twentyfold for a filter the client can apply itself.
 */
export function specBucketKey(query: ProofQuery): string {
  return `${query.cityId}|${bedsBucket(query.beds)}|b${budgetBandIndex(query.budgetEur)}`;
}
