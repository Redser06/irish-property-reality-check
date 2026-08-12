import { describe, expect, it } from 'vitest';
import type { CityData, InputConfidence, PriceBand } from '../types';
import { calculateComparison, resolvePriceBand } from './comparatorEngine';

const band = (over: Partial<PriceBand> = {}): PriceBand => ({
  pricePerSqM: 4000,
  basis: 'all-dwellings',
  source: 'Test source',
  asOf: '2026-01-01',
  confidence: 'measured',
  ...over,
});

function makeCity(over: Partial<CityData> = {}): CityData {
  return {
    id: 'test', name: 'Test', country: 'Testland', flagEmoji: '🏳️',
    region: 'UK & Europe', lane: 2, currency: 'EUR', currencySymbol: '€',
    exchangeRateFromEur: 1, pricePerSqM: 4000,
    typicalBuilding: 'Test', sunnyDaysPerYear: 140, averageSummerTempC: 20,
    samplePerks: ['perk'], imageUrl: 'https://example.com/i.jpg',
    portalName: 'Portal', sarcasticQuote: 'Quote',
    searchKeywords: 'kw', portalSearchUrl: 'https://example.com',
    ...over,
  };
}

const conf = (over: Partial<InputConfidence> = {}): InputConfidence => ({
  price: 'read', beds: 'read', area: 'read', source: 'free-text', ...over,
});

describe('resolvePriceBand', () => {
  it('falls back to a synthesised band when the city has no matrix', () => {
    const city = makeCity({
      pricePerSqM: 3200,
      pricePerSqMBasis: 'house',
      pricePerSqMSource: 'Editorial estimate',
      pricePerSqMAsOf: '2026-08-09',
      pricePerSqMConfidence: 'estimated',
    });

    const sel = resolvePriceBand(city, { kind: 'semi', zone: 't15_30' });

    expect(sel.fallbackLevel).toBe('city-default');
    expect(sel.band.pricePerSqM).toBe(3200);
    expect(sel.band.confidence).toBe('estimated');
    // What was asked for is preserved even though it could not be honoured.
    expect(sel.requested).toEqual({ kind: 'semi', zone: 't15_30' });
    expect(sel.resolved).toEqual({});
  });

  it('treats a city with no stated confidence as estimated, never as fact', () => {
    expect(resolvePriceBand(makeCity()).band.confidence).toBe('estimated');
  });

  it('picks the exact zone+kind cell when it exists', () => {
    const city = makeCity({
      priceMatrix: {
        default: band(),
        byKind: { semi: band({ pricePerSqM: 3800 }) },
        byZone: { t15_30: { all: band({ pricePerSqM: 3500 }), byKind: { semi: band({ pricePerSqM: 3300 }) } } },
      },
    });

    const sel = resolvePriceBand(city, { kind: 'semi', zone: 't15_30' });
    expect(sel.fallbackLevel).toBe('exact');
    expect(sel.band.pricePerSqM).toBe(3300);
  });

  it('falls back to the zone-wide figure rather than averaging per-kind cells', () => {
    const city = makeCity({
      priceMatrix: {
        default: band(),
        byZone: { t15_30: { all: band({ pricePerSqM: 3500 }), byKind: { apartment: band({ pricePerSqM: 5000 }) } } },
      },
    });

    const sel = resolvePriceBand(city, { kind: 'detached', zone: 't15_30' });
    expect(sel.fallbackLevel).toBe('zone-only');
    expect(sel.band.pricePerSqM).toBe(3500);
  });

  it('falls back to kind when the requested zone has no data', () => {
    const city = makeCity({
      priceMatrix: { default: band(), byKind: { semi: band({ pricePerSqM: 3800 }) } },
    });

    const sel = resolvePriceBand(city, { kind: 'semi', zone: 'beyond' });
    expect(sel.fallbackLevel).toBe('kind-only');
    expect(sel.band.pricePerSqM).toBe(3800);
  });
});

describe('provenance rollup', () => {
  const input = {
    title: 't', priceEur: 550_000, beds: 2, baths: 1, sqft: 850,
    location: 'Dublin 12', propertyType: 'Semi-Detached', berRating: 'D2', features: [],
  };

  it('drops to low confidence when the floor area was assumed, even with measured price data', () => {
    const city = makeCity({ pricePerSqMConfidence: 'measured' });
    const result = calculateComparison(input, city, { inputConfidence: conf({ area: 'assumed' }) });

    expect(result.provenance.overall).toBe('low');
    expect(result.provenance.caveats.join(' ')).toMatch(/floor area was assumed/i);
  });

  it('drops to low confidence when the city price is an editorial estimate', () => {
    const city = makeCity({ pricePerSqMConfidence: 'estimated' });
    const result = calculateComparison(input, city, { inputConfidence: conf() });

    expect(result.provenance.overall).toBe('low');
  });

  it('reaches high confidence only when the input was read and the data measured', () => {
    const city = makeCity({
      pricePerSqMConfidence: 'measured',
      priceMatrix: {
        default: band(),
        byZone: { t15_30: { all: band(), byKind: { semi: band({ pricePerSqM: 3300 }) } } },
      },
    });

    const result = calculateComparison(
      { ...input, kind: 'semi', zone: 't15_30' },
      city,
      { inputConfidence: conf() },
    );

    expect(result.provenance.overall).toBe('high');
    expect(result.provenance.caveats).toEqual([]);
  });

  it('defaults to preset confidence when the caller supplies none', () => {
    const result = calculateComparison(input, makeCity({ pricePerSqMConfidence: 'measured' }));
    expect(result.provenance.input.source).toBe('preset');
    // A preset area is not the user's own, so it can never be 'high'.
    expect(result.provenance.overall).toBe('medium');
  });

  it('uses the resolved band, not the flat city average, to size the result', () => {
    const city = makeCity({
      pricePerSqM: 4000,
      priceMatrix: { default: band(), byKind: { semi: band({ pricePerSqM: 2000 }) } },
    });

    const result = calculateComparison({ ...input, kind: 'semi' }, city, { inputConfidence: conf() });

    // 550,000 / 2,000 = 275 m2, not 550,000 / 4,000 = 137.5.
    expect(result.estimatedSqM).toBe(275);
    expect(result.provenance.band.band.pricePerSqM).toBe(2000);
  });
});
