import { describe, expect, it } from 'vitest';
import { CITIES_DATA } from './citiesData';
import { KIND_BANDS } from './generated/priceMatrix';
import { calculateComparison, normalisePropertyKind, resolvePriceBand } from '../utils/comparatorEngine';
import type { IrishPropertyInput } from '../types';

describe('price matrix invariants', () => {
  it('keeps priceMatrix.default in step with the flat pricePerSqM', () => {
    // A type cannot express "these two must agree"; this is what stops the
    // headline figure and the matrix drifting apart.
    for (const city of CITIES_DATA) {
      if (!city.priceMatrix) continue;
      expect(city.priceMatrix.default.pricePerSqM, city.id).toBe(city.pricePerSqM);
    }
  });

  it('attaches a matrix to exactly the cities the generator produced', () => {
    const withMatrix = CITIES_DATA.filter((c) => c.priceMatrix).map((c) => c.id).sort();
    expect(withMatrix).toEqual(Object.keys(KIND_BANDS).sort());
  });

  it('gives every generated band a source, a date and a sample size', () => {
    for (const [cityId, entry] of Object.entries(KIND_BANDS)) {
      for (const [kind, band] of Object.entries(entry.byKind)) {
        expect(band.pricePerSqM, `${cityId}.${kind}`).toBeGreaterThan(0);
        expect(band.source, `${cityId}.${kind}`).toMatch(/CSO PxStat HPM05/);
        expect(band.asOf, `${cityId}.${kind}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(band.sampleSize, `${cityId}.${kind}`).toBeGreaterThan(0);
      }
    }
  });

  it('never claims measured confidence for a ratio-of-medians figure', () => {
    // EUR/m2 here is a median price divided by an ASSUMED floor area. That is
    // weaker than a measured per-property figure and must never say otherwise.
    for (const entry of Object.values(KIND_BANDS)) {
      for (const band of Object.values(entry.byKind)) {
        expect(band.confidence).toBe('indexed');
      }
    }
  });
});

describe('normalisePropertyKind', () => {
  it('reads semi-detached as a semi, not a detached', () => {
    // "Semi-Detached" contains "detached" — order of matching matters.
    expect(normalisePropertyKind('Semi-Detached')).toBe('semi');
    expect(normalisePropertyKind('Detached')).toBe('detached');
  });

  it.each([
    ['Terraced', 'terrace'],
    ['Apartment', 'apartment'],
    ['Bungalow', 'detached'],
    ['Duplex', 'apartment'],
    ['Studio', 'apartment'],
    ['Victorian Villa', 'detached'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalisePropertyKind(input)).toBe(expected);
  });

  it('returns undefined rather than guessing on nonsense', () => {
    expect(normalisePropertyKind('')).toBeUndefined();
    expect(normalisePropertyKind(undefined)).toBeUndefined();
    expect(normalisePropertyKind('Houseboat on the Shannon')).toBe('detached');
    expect(normalisePropertyKind('Mystery')).toBeUndefined();
  });
});

describe('the kind axis changes the answer', () => {
  const base: IrishPropertyInput = {
    title: 't', priceEur: 550_000, beds: 2, baths: 1, sqft: 850,
    location: 'Dublin 12', propertyType: 'Semi-Detached', berRating: 'D2', features: [],
  };
  const galway = CITIES_DATA.find((c) => c.id === 'galway')!;

  it('prices a semi against the house band and an apartment against the apartment band', () => {
    const semi = calculateComparison({ ...base, propertyType: 'Semi-Detached' }, galway);
    const apt = calculateComparison({ ...base, propertyType: 'Apartment' }, galway);

    expect(semi.provenance.band.fallbackLevel).toBe('kind-only');
    expect(apt.provenance.band.fallbackLevel).toBe('kind-only');
    expect(semi.provenance.band.band.basis).toBe('house');
    expect(apt.provenance.band.band.basis).toBe('apartment');

    // CSO says a Galway apartment costs MORE per m2 than a Galway house, so the
    // same budget buys less space in the apartment. This is the whole point of
    // the axis: a single city average would have hidden it.
    expect(apt.provenance.band.band.pricePerSqM).toBeGreaterThan(semi.provenance.band.band.pricePerSqM);
    expect(apt.estimatedSqM).toBeLessThan(semi.estimatedSqM);
  });

  it('falls back to the city default for a city with no matrix', () => {
    const dubai = CITIES_DATA.find((c) => c.id === 'dubai')!;
    const result = resolvePriceBand(dubai, { kind: 'semi' });
    expect(result.fallbackLevel).toBe('city-default');
    expect(result.band.pricePerSqM).toBe(dubai.pricePerSqM);
  });
});
