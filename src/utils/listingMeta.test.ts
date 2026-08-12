import { describe, expect, it } from 'vitest';
import type { IrishPropertyInput, ParseResult } from '../types';
import { mergeListingMeta, type ListingMetaResponse } from './listingMeta';

const fallback: IrishPropertyInput = {
  title: 'Preset', priceEur: 550_000, beds: 2, baths: 1, sqft: 850,
  location: 'Dublin 12', propertyType: 'Semi-Detached', berRating: 'D2', features: [],
};

/** What the local parser produces for a Daft URL it cannot read anything from. */
const localMiss: ParseResult = {
  input: { ...fallback, url: 'https://www.daft.ie/for-sale/x/1', title: 'Property from www.daft.ie' },
  extracted: { price: false, beds: false, area: false },
  isUrl: true,
  warning: "Couldn't read the details from that link — enter them manually below.",
};

const ok = (fields: ListingMetaResponse extends { ok: true } ? never : Record<string, string>): ListingMetaResponse =>
  ({ ok: true, source: 'og', fields, fetchedAt: '2026-08-10T00:00:00.000Z' });

describe('mergeListingMeta', () => {
  it('is a no-op when the fetch failed, so a blocked portal never regresses the local parse', () => {
    expect(mergeListingMeta(localMiss, null)).toBe(localMiss);
    expect(mergeListingMeta(localMiss, { ok: false, reason: 'upstream-error', message: 'nope' })).toBe(localMiss);
  });

  it('upgrades price, beds and area from the listing text', () => {
    const merged = mergeListingMeta(
      localMiss,
      ok({
        title: '3 bed Terraced House, 14 Oak Road, Dublin 12',
        description: 'Asking €425,000. 1,300 sq ft of living space.',
      }),
    );

    expect(merged.input.priceEur).toBe(425_000);
    expect(merged.input.beds).toBe(3);
    expect(merged.input.sqft).toBe(1_300);
    expect(merged.extracted).toEqual({ price: true, beds: true, area: true });
    expect(merged.warning).toBeUndefined();
  });

  it('leaves a field assumed when the listing did not supply it — OG only ever upgrades', () => {
    // Title carries a price but no floor area. Area must stay unread.
    const merged = mergeListingMeta(localMiss, ok({ title: 'House for sale, Dublin 12 — €425,000' }));

    expect(merged.extracted.price).toBe(true);
    expect(merged.extracted.area).toBe(false);
    expect(merged.input.sqft).toBe(850); // untouched fallback
  });

  it('keeps the warning when the fetch succeeded but told us nothing useful', () => {
    const merged = mergeListingMeta(localMiss, ok({ title: 'Property for sale' }));

    expect(merged.extracted).toEqual({ price: false, beds: false, area: false });
    expect(merged.warning).toBe(localMiss.warning);
  });

  it('prefers a machine-readable EUR price over one scraped from prose', () => {
    const merged = mergeListingMeta(
      localMiss,
      ok({ title: 'Guide price €400,000', priceAmount: '425000', priceCurrency: 'EUR' }),
    );
    expect(merged.input.priceEur).toBe(425_000);
  });

  it('ignores a machine-readable price in a foreign currency rather than treating it as euro', () => {
    const merged = mergeListingMeta(localMiss, ok({ title: 'For sale', priceAmount: '425000', priceCurrency: 'GBP' }));
    expect(merged.input.priceEur).toBe(550_000);
    expect(merged.extracted.price).toBe(false);
  });

  it('rejects an implausible machine-readable price', () => {
    const merged = mergeListingMeta(localMiss, ok({ title: 'For sale', priceAmount: '12', priceCurrency: 'EUR' }));
    expect(merged.input.priceEur).toBe(550_000);
  });

  it('does not downgrade something the local parser already read', () => {
    const localHit: ParseResult = {
      input: { ...fallback, priceEur: 675_000 },
      extracted: { price: true, beds: false, area: false },
      isUrl: true,
    };
    const merged = mergeListingMeta(localHit, ok({ title: 'No numbers here at all' }));

    expect(merged.extracted.price).toBe(true);
    expect(merged.input.priceEur).toBe(675_000);
  });
});
