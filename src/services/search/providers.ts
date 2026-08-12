/**
 * Provider implementations.
 *
 * No vendor is chosen yet, on purpose: the right choice depends on which buckets
 * actually get hit, and that is unknowable before launch. When one is picked
 * (Serper for Google's index, Brave for an independent one, or an official portal
 * API like Idealista where it exists), it implements SearchProvider and must pass
 * the shared contract test.
 */
import type { ProofListing, ProofQuery, SearchProvider } from './types';
import { specBucketKey } from './bucket';

/** Production default until a vendor exists. Honest about knowing nothing. */
export const nullSearchProvider: SearchProvider = {
  name: 'null',
  async search(): Promise<ProofListing[]> {
    return [];
  },
};

/** Deterministic pseudo-random in [0,1) from a string — no Math.random, so tests are stable. */
function seeded(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100_000) / 100_000;
}

/**
 * Development stand-in. Generates plausible listings seeded by the bucket key, so
 * the same query always yields the same results and snapshots do not churn.
 */
export function createFakeSearchProvider(count = 6): SearchProvider {
  return {
    name: 'fake',
    async search(query: ProofQuery): Promise<ProofListing[]> {
      const bucket = specBucketKey(query);
      return Array.from({ length: count }, (_, i) => {
        const jitter = 0.85 + seeded(bucket, i) * 0.3;
        const priceLocal = Math.round((query.budgetEur * jitter) / 1_000) * 1_000;
        const areaSqM = Math.round(60 + seeded(bucket, i + 100) * 140);
        return {
          id: `${bucket}#${i}`,
          title: `${query.beds ?? 3} bed property in ${query.cityId}`,
          priceLocal,
          currency: 'EUR',
          areaSqM,
          beds: query.beds,
          kind: query.kind,
          url: `https://example.invalid/listing/${encodeURIComponent(bucket)}/${i}`,
          imageUrl: undefined,
          sourceName: 'Example Portal (sample data)',
          capturedAt: '2026-08-12T00:00:00.000Z',
        };
      });
    },
  };
}
