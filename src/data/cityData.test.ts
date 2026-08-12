import { describe, expect, it } from 'vitest';
import { CITIES_DATA } from './citiesData';
import { FX_RATES, FX_AS_OF } from './generated/fx';

/**
 * Data invariants across all 25 real city entries.
 *
 * These exist because the audit found two numbers that disagreed with each other
 * and nothing caught it: price/m2 figures mixing apartment and house bases, and
 * FX rates ~9% adrift. A type cannot express "these two values must agree" —
 * a test can.
 */
describe('CITIES_DATA invariants', () => {
  it('has at least one city and a stable lane split', () => {
    expect(CITIES_DATA.length).toBeGreaterThan(0);
    expect(CITIES_DATA.filter((c) => c.lane === 1).length).toBeGreaterThan(0);
    expect(CITIES_DATA.filter((c) => c.lane === 2).length).toBeGreaterThan(0);
  });

  it('gives every city a unique id', () => {
    const ids = CITIES_DATA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every city a unique image (Toronto once showed a photo of Sydney)', () => {
    const images = CITIES_DATA.map((c) => c.imageUrl);
    expect(new Set(images).size).toBe(images.length);
  });

  it('keeps the deprecated per-city exchangeRateFromEur in step with the ECB artifact', () => {
    for (const city of CITIES_DATA) {
      expect(
        city.exchangeRateFromEur,
        `${city.id} (${city.currency}) is out of step with FX_RATES — run: npx tsx tools/ingest/syncCityFxLiterals.ts`,
      ).toBe(FX_RATES[city.currency]);
    }
  });

  it('carries a source, a date and a basis for every price/m2 figure', () => {
    for (const city of CITIES_DATA) {
      expect(city.pricePerSqM, `${city.id} price/m2`).toBeGreaterThan(0);
      expect(city.pricePerSqMSource, `${city.id} source`).toBeTruthy();
      expect(city.pricePerSqMAsOf, `${city.id} asOf`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(city.pricePerSqMBasis, `${city.id} basis`).toBeTruthy();
    }
  });

  it('never prices a house-archetype city on apartment data', () => {
    // The defect this repo shipped and then reverted: apartment EUR/m2 runs well
    // above house EUR/m2, so using it for a detached/terraced archetype halves the
    // space the app claims the budget buys.
    //
    // Sydney and Toronto are accepted exceptions: both name a dual archetype
    // ("Bondi Beach Apartment OR North Shore Family Home", "Glass Condo Tower OR
    // Victorian Semi") and are legitimately sourced on apartment data. Any NEW
    // city landing here is a real defect, not a naming quirk.
    const DUAL_ARCHETYPE = new Set(['sydney', 'toronto']);
    const houseArchetype = /bungalow|villa|cottage|semi|terrace|detached|house|queenslander/i;

    const mismatched = CITIES_DATA.filter(
      (c) =>
        c.pricePerSqMBasis === 'apartment' &&
        houseArchetype.test(c.typicalBuilding) &&
        !DUAL_ARCHETYPE.has(c.id),
    ).map((c) => `${c.id}: "${c.typicalBuilding}"`);

    expect(mismatched).toEqual([]);
  });
});

describe('FX artifact', () => {
  it('quotes every currency the city data uses', () => {
    for (const city of CITIES_DATA) {
      expect(FX_RATES[city.currency], `missing FX for ${city.currency}`).toBeGreaterThan(0);
    }
  });

  it('anchors EUR at exactly 1', () => {
    expect(FX_RATES.EUR).toBe(1);
  });

  it('records the ECB quote date', () => {
    expect(FX_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
