import { describe, expect, it } from 'vitest';
import type { CityData, IrishPropertyInput } from '../types';
import { SQFT_PER_SQM } from './units';
import {
  calculateComparison,
  parseIrishPropertyInput as parse,
  PINT_PRICE_EUR,
} from './comparatorEngine';

const fallback: IrishPropertyInput = {
  title: '2 Bed Semi-Detached House in Crumlin / Terenure Border',
  priceEur: 550000,
  beds: 2,
  baths: 1,
  sqft: 850,
  location: 'Dublin 12',
  propertyType: 'Semi-Detached',
  berRating: 'D2',
  features: [],
};

const dublinBaselineSunnyDays = 140;

function makeCity(overrides: Partial<CityData>): CityData {
  return {
    id: 'test-city',
    name: 'Test City',
    country: 'Testland',
    flagEmoji: '🏳️',
    region: 'UK & Europe',
    lane: 2,
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRateFromEur: 1.0,
    pricePerSqM: 4000,
    typicalBuilding: 'Test Building',
    sunnyDaysPerYear: dublinBaselineSunnyDays,
    averageSummerTempC: 20,
    samplePerks: ['A perk'],
    imageUrl: 'https://example.com/image.jpg',
    portalName: 'TestPortal',
    sarcasticQuote: 'Test quote.',
    searchKeywords: 'test city house for sale',
    portalSearchUrl: 'https://example.com/search',
    ...overrides,
  };
}

describe('parseIrishPropertyInput', () => {
  it('does NOT silently fall back to the sample price for a Daft URL with no embedded price', () => {
    const result = parse(
      'https://www.daft.ie/for-sale/terraced-house-14-oak-road-dublin-12/5678901',
      fallback
    );
    // The URL contains stray digits ("14", "12", "5678901") but no real
    // price. The engine must flag that nothing was extracted rather than
    // silently presenting a number (fallback or a misparsed slug digit) as
    // if it were the property's actual price.
    expect(result.extracted.price).toBe(false);
    expect(result.warning).toBeTruthy();
  });

  it('extracts beds from a hyphenated slug ("3-bed") on a MyHome URL', () => {
    const result = parse(
      'https://www.myhome.ie/residential/brochure/3-bed-semi-crumlin-dublin-12/4839201',
      fallback
    );
    expect(result.extracted.beds).toBe(true);
    expect(result.input.beds).toBe(3);
  });

  it('does not throw on a bare "http://" input', () => {
    expect(() => parse('http://', fallback)).not.toThrow();
  });

  it('parses "3 bed Kinsale 450000" as price 450000, beds 3, and does not treat "Kinsale" as a k-multiplier trigger', () => {
    const result = parse('3 bed Kinsale 450000', fallback);
    expect(result.input.priceEur).toBe(450000);
    expect(result.input.beds).toBe(3);
  });

  it('parses "€600k 3 bed house in Dublin" as price 600000, beds 3', () => {
    const result = parse('€600k 3 bed house in Dublin', fallback);
    expect(result.input.priceEur).toBe(600000);
    expect(result.input.beds).toBe(3);
  });

  it('parses "€1,200,000 4 bed detached Killiney" as price 1200000, beds 4', () => {
    const result = parse('€1,200,000 4 bed detached Killiney', fallback);
    expect(result.input.priceEur).toBe(1200000);
    expect(result.input.beds).toBe(4);
  });

  it('parses a bare "750000" as price 750000', () => {
    const result = parse('750000', fallback);
    expect(result.input.priceEur).toBe(750000);
  });

  it('parses "1,300 sq ft 3-bed Ranelagh €850,000" with area, beds, and price all extracted', () => {
    const result = parse('1,300 sq ft 3-bed Ranelagh €850,000', fallback);
    expect(result.extracted.area).toBe(true);
    expect(result.input.sqft).toBe(1300);
    expect(result.input.beds).toBe(3);
    expect(result.input.priceEur).toBe(850000);
  });

  it('returns the fallback unchanged with no warning for empty input', () => {
    const result = parse('', fallback);
    expect(result.input).toEqual(fallback);
    expect(result.warning).toBeFalsy();
  });
});

describe('calculateComparison', () => {
  it('scores a city with FEWER sunny days than the Dublin baseline LOWER than an otherwise-identical sunnier city', () => {
    const sunnierCity = makeCity({ id: 'sunnier', sunnyDaysPerYear: dublinBaselineSunnyDays + 100 });
    const dullerCity = makeCity({ id: 'duller', sunnyDaysPerYear: dublinBaselineSunnyDays - 100 });

    const sunnierResult = calculateComparison(fallback, sunnierCity);
    const dullerResult = calculateComparison(fallback, dullerCity);

    expect(dullerResult.remorseIndex).toBeLessThan(sunnierResult.remorseIndex);
  });

  it('rounds m2 and sq ft independently from the exact value, not one from the other', () => {
    const city = makeCity({ pricePerSqM: 4000 });
    const result = calculateComparison(fallback, city);

    // 550,000 / 4,000 = 137.5 m2 exactly.
    const exactSqM = fallback.priceEur / city.pricePerSqM;

    expect(result.estimatedSqM).toBe(Math.round(exactSqM));
    expect(result.estimatedSqFt).toBe(Math.round(exactSqM * SQFT_PER_SQM));

    // Deriving sq ft from the ROUNDED m2 would give 1,485 here instead of 1,480 —
    // the rounding error compounding through the conversion. The two figures must
    // still agree to within one m2's worth of sq ft.
    expect(Math.abs(result.estimatedSqFt - result.estimatedSqM * SQFT_PER_SQM))
      .toBeLessThan(SQFT_PER_SQM);

    const expectedMultiplier = result.estimatedSqFt / (fallback.sqft || 900);
    expect(result.spaceMultiplier).toBeCloseTo(expectedMultiplier, 1);
  });
});

describe('PINT_PRICE_EUR', () => {
  it('is set to 6.5', () => {
    expect(PINT_PRICE_EUR).toBe(6.5);
  });
});
