import { describe, expect, it } from 'vitest';
import { calculateOwnership, purchaseTaxEur, recurringTaxEur } from './ownership';
import { COSTS_BY_COUNTRY } from '../data/ownershipCosts';
import { CITIES_DATA } from '../data/citiesData';
import { calculateComparison } from './comparatorEngine';
import type { CityCosts, IrishPropertyInput } from '../types';

describe('purchaseTaxEur', () => {
  const irish = COSTS_BY_COUNTRY.Ireland.purchase.transferTax;

  it('applies each band only to the slice of value inside it', () => {
    // Irish stamp duty: 1% to 1m, 2% to 1.5m, 6% above.
    expect(purchaseTaxEur(500_000, irish)).toBe(5_000);
    expect(purchaseTaxEur(1_000_000, irish)).toBe(10_000);
  });

  it('does not apply the higher rate to the whole amount at a band boundary', () => {
    // The classic off-by-one: one euro over 1m must cost ~2 cents more, not
    // 10,000 euro more.
    const at = purchaseTaxEur(1_000_000, irish);
    const justOver = purchaseTaxEur(1_000_001, irish);
    expect(justOver - at).toBeCloseTo(0.02, 2);
  });

  it('handles a value spanning all three bands', () => {
    // 1% of 1m + 2% of 500k + 6% of 100k = 10,000 + 10,000 + 6,000
    expect(purchaseTaxEur(1_600_000, irish)).toBe(26_000);
  });

  it('computes a flat percentage', () => {
    expect(purchaseTaxEur(400_000, { model: 'flat-pct', ratePct: 4 })).toBe(16_000);
  });

  it('returns zero inside a zero-rated band', () => {
    expect(purchaseTaxEur(100_000, COSTS_BY_COUNTRY.England.purchase.transferTax)).toBe(0);
  });
});

describe('recurringTaxEur', () => {
  it('supports rate-of-value, flat and none', () => {
    expect(recurringTaxEur(500_000, { model: 'rate-of-value', ratePct: 1.4 })).toBe(7_000);
    expect(recurringTaxEur(500_000, { model: 'flat', annualEur: 2_300 })).toBe(2_300);
    expect(recurringTaxEur(500_000, { model: 'none' })).toBe(0);
  });
});

describe('calculateOwnership', () => {
  const costs: CityCosts = COSTS_BY_COUNTRY.Ireland;

  it('charges a service charge to apartments but not to houses', () => {
    const apt = calculateOwnership(500_000, 100, 'apartment', costs);
    const house = calculateOwnership(500_000, 100, 'detached', costs);

    expect(apt.breakdown.some((l) => l.label === 'Service charge')).toBe(true);
    expect(house.breakdown.some((l) => l.label === 'Service charge')).toBe(false);
    expect(apt.annualEur).toBeGreaterThan(house.annualEur);
  });

  it('sums the ten-year total as upfront plus ten annual years', () => {
    const o = calculateOwnership(500_000, 100, 'detached', costs);
    expect(o.tenYearTotalEur).toBe(o.upfrontEur + o.annualEur * 10);
  });

  it('scales energy with floor area, so a bigger house costs more to run', () => {
    const small = calculateOwnership(500_000, 80, 'detached', costs);
    const big = calculateOwnership(500_000, 200, 'detached', costs);
    expect(big.annualEur).toBeGreaterThan(small.annualEur);
  });

  it('carries the source and confidence through rather than presenting a bare number', () => {
    const o = calculateOwnership(500_000, 100, 'detached', costs);
    expect(o.source).toBeTruthy();
    expect(['measured', 'indexed', 'estimated']).toContain(o.confidence);
  });
});

describe('TCO reorders the comparison', () => {
  const input: IrishPropertyInput = {
    title: 't', priceEur: 550_000, beds: 2, baths: 1, sqft: 850,
    location: 'Dublin 12', propertyType: 'Semi-Detached', berRating: 'D2', features: [],
  };

  it('makes a US city cost far more to hold than an Irish one at the same price', () => {
    // US recurring property tax is ~1.4% of value; Irish LPT is ~0.1%. This is
    // the single line that makes sticker price a bad guide.
    const atlanta = calculateComparison(input, CITIES_DATA.find((c) => c.id === 'atlanta')!);
    const cork = calculateComparison(input, CITIES_DATA.find((c) => c.id === 'cork')!);

    expect(atlanta.ownership!.annualEur).toBeGreaterThan(cork.ownership!.annualEur * 1.5);
  });

  it('charges no recurring property tax in the UAE', () => {
    const dubai = calculateComparison(input, CITIES_DATA.find((c) => c.id === 'dubai')!);
    expect(dubai.ownership!.breakdown.find((l) => l.label === 'Property tax')!.annualEur).toBe(0);
  });

  it('gives every city in the dataset a cost profile', () => {
    const missing = CITIES_DATA.filter((c) => !c.costs).map((c) => `${c.id} (${c.country})`);
    expect(missing).toEqual([]);
  });
});
