import { describe, expect, it } from 'vitest';
import { ZONE_OPTIONS, ZONE_LABEL, suggestZoneFromLocation } from './zones';
import { CITIES_DATA } from '../data/citiesData';
import { calculateComparison, resolvePriceBand } from './comparatorEngine';
import type { IrishPropertyInput } from '../types';

describe('zone options', () => {
  it('names every ring by time, not by density vocabulary', () => {
    // "Inner suburb" would imply a judgement the data does not make; the axis
    // measures minutes, so the label says minutes.
    for (const z of ZONE_OPTIONS) {
      expect(z.label).toMatch(/min|hour/i);
    }
    expect(Object.keys(ZONE_LABEL)).toHaveLength(ZONE_OPTIONS.length);
  });

  it('covers the whole range with no gaps', () => {
    expect(ZONE_OPTIONS.map((z) => z.id)).toEqual(['t0_15', 't15_30', 't30_45', 't45_60', 'beyond']);
  });
});

describe('suggestZoneFromLocation', () => {
  it('places central Dublin districts in the innermost ring', () => {
    expect(suggestZoneFromLocation('Dublin 2')).toBe('t0_15');
    expect(suggestZoneFromLocation('Dublin 8')).toBe('t0_15');
  });

  it('places outer Dublin districts further out', () => {
    expect(suggestZoneFromLocation('Dublin 12')).toBe('t30_45');
    expect(suggestZoneFromLocation('Dublin 15')).toBe('t45_60');
  });

  it('handles the Dublin 6W oddity', () => {
    expect(suggestZoneFromLocation('Dublin 6W')).toBe('t15_30');
  });

  it('treats a county address as commuter belt', () => {
    expect(suggestZoneFromLocation('Co. Wicklow')).toBe('beyond');
  });

  it('returns undefined rather than guessing when it cannot tell', () => {
    expect(suggestZoneFromLocation('Somewhere lovely')).toBeUndefined();
    expect(suggestZoneFromLocation('')).toBeUndefined();
    expect(suggestZoneFromLocation(undefined)).toBeUndefined();
    // A district we have no hint for must not be forced into a ring.
    expect(suggestZoneFromLocation('Dublin 99')).toBeUndefined();
  });
});

describe('cities without zone data behave normally, not as errors', () => {
  const input: IrishPropertyInput = {
    title: 't', priceEur: 550_000, beds: 2, baths: 1, sqft: 850,
    location: 'Dublin 12', propertyType: 'Semi-Detached', berRating: 'D2', features: [],
    zone: 't30_45',
  };

  it('falls back cleanly when a zone is requested but the city has none', () => {
    // No city has byZone data yet. Requesting a zone must degrade to the kind or
    // city figure and SAY so, never fail and never fabricate a ring.
    for (const city of CITIES_DATA) {
      const sel = resolvePriceBand(city, { kind: 'semi', zone: 't30_45' });
      expect(['kind-only', 'city-default']).toContain(sel.fallbackLevel);
      expect(sel.requested.zone).toBe('t30_45');
      expect(sel.resolved.zone).toBeUndefined();
      expect(sel.band.pricePerSqM).toBeGreaterThan(0);
    }
  });

  it('still produces a full comparison for every city with a zone set', () => {
    for (const city of CITIES_DATA) {
      const result = calculateComparison(input, city);
      expect(result.estimatedSqM).toBeGreaterThan(0);
      expect(result.provenance.band.band.source).toBeTruthy();
    }
  });
});
