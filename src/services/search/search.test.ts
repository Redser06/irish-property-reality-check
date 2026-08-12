import { describe, expect, it } from 'vitest';
import { BAND_RATIO, bedsBucket, budgetBandIndex, specBucketKey } from './bucket';
import { createFakeSearchProvider, nullSearchProvider } from './providers';
import type { ProofQuery, SearchProvider } from './types';

const q = (over: Partial<ProofQuery> = {}): ProofQuery => ({ cityId: 'cork', budgetEur: 550_000, beds: 3, ...over });

describe('budget banding', () => {
  it('is deterministic', () => {
    expect(budgetBandIndex(550_000)).toBe(budgetBandIndex(550_000));
  });

  it('never decreases as budget rises', () => {
    let previous = -Infinity;
    for (let b = 50_000; b <= 2_000_000; b += 10_000) {
      const idx = budgetBandIndex(b);
      expect(idx).toBeGreaterThanOrEqual(previous);
      previous = idx;
    }
  });

  it('puts nearby budgets in the same band and distant ones apart', () => {
    expect(budgetBandIndex(550_000)).toBe(budgetBandIndex(560_000));
    expect(budgetBandIndex(550_000)).not.toBe(budgetBandIndex(550_000 * BAND_RATIO * BAND_RATIO));
  });

  it('clamps implausibly small budgets rather than producing runaway indices', () => {
    expect(budgetBandIndex(1)).toBe(budgetBandIndex(50_000));
    expect(Number.isFinite(budgetBandIndex(0))).toBe(true);
  });
});

describe('bedsBucket', () => {
  it.each([
    [undefined, 'any'], [1, '1'], [2, '2'], [3, '3'], [4, '4plus'], [9, '4plus'], [0, '1'],
  ])('maps %s to %s', (input, expected) => {
    expect(bedsBucket(input as number | undefined)).toBe(expected);
  });
});

describe('specBucketKey — the cost control', () => {
  it('ignores kind and zone, which the client filters instead', () => {
    // Including them would multiply the bucket count ~20x for a filter we can
    // apply locally, and most of those buckets would never be warm.
    const base = specBucketKey(q());
    expect(specBucketKey(q({ kind: 'semi' }))).toBe(base);
    expect(specBucketKey(q({ zone: 't30_45' }))).toBe(base);
  });

  it('separates different cities, bed counts and budget bands', () => {
    const base = specBucketKey(q());
    expect(specBucketKey(q({ cityId: 'galway' }))).not.toBe(base);
    expect(specBucketKey(q({ beds: 4 }))).not.toBe(base);
    expect(specBucketKey(q({ budgetEur: 2_000_000 }))).not.toBe(base);
  });

  it('keeps total bucket count bounded across a realistic budget range', () => {
    // This is the test that stops the cache design silently regressing. If a
    // future change reintroduces kind/zone into the key, this number explodes.
    const keys = new Set<string>();
    const cities = ['cork', 'galway', 'london', 'sydney', 'atlanta'];
    for (const cityId of cities) {
      for (const beds of [undefined, 1, 2, 3, 4, 6]) {
        for (let b = 100_000; b <= 2_000_000; b += 25_000) {
          keys.add(specBucketKey({ cityId, budgetEur: b, beds }));
        }
      }
    }
    // 5 cities x 5 distinct bed buckets x ~22 budget bands.
    expect(keys.size).toBeLessThan(600);
  });
});

/** Any future vendor implementation must pass this unchanged. */
function contractTest(name: string, provider: SearchProvider, expectResults: boolean) {
  describe(`SearchProvider contract — ${name}`, () => {
    it('has a name', () => {
      expect(provider.name).toBeTruthy();
    });

    it('resolves to an array', async () => {
      expect(Array.isArray(await provider.search(q()))).toBe(true);
    });

    it('returns well-formed listings or nothing at all', async () => {
      const listings = await provider.search(q());
      if (!expectResults) {
        expect(listings).toEqual([]);
        return;
      }
      expect(listings.length).toBeGreaterThan(0);
      for (const l of listings) {
        expect(l.id).toBeTruthy();
        expect(l.title).toBeTruthy();
        expect(l.priceLocal).toBeGreaterThan(0);
        expect(l.currency).toMatch(/^[A-Z]{3}$/);
        expect(l.url).toMatch(/^https:\/\//);
        expect(l.sourceName).toBeTruthy();
        expect(l.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('is deterministic for the same query', async () => {
      const [a, b] = await Promise.all([provider.search(q()), provider.search(q())]);
      expect(a).toEqual(b);
    });
  });
}

contractTest('null', nullSearchProvider, false);
contractTest('fake', createFakeSearchProvider(), true);

describe('fake provider', () => {
  it('varies results across buckets but not within one', async () => {
    const p = createFakeSearchProvider();
    const cork = await p.search(q({ cityId: 'cork' }));
    const galway = await p.search(q({ cityId: 'galway' }));
    expect(cork[0].priceLocal).not.toBe(galway[0].priceLocal);
  });

  it('labels its data as samples so it can never be mistaken for real listings', async () => {
    const listings = await createFakeSearchProvider().search(q());
    expect(listings[0].sourceName).toMatch(/sample/i);
    expect(listings[0].url).toContain('example.invalid');
  });
});
