import { describe, expect, it } from 'vitest';
import type { CityData, IrishPropertyInput } from '../types';
// TODO(integration): Agent A is rewriting comparatorEngine.ts in parallel to
// the new contract documented in the remediation brief:
//
//   export interface ParseResult {
//     input: IrishPropertyInput;
//     extracted: { price: boolean; beds: boolean; area: boolean };
//     isUrl: boolean;
//     warning?: string;
//   }
//   export function parseIrishPropertyInput(rawInput: string, fallbackInput: IrishPropertyInput): ParseResult
//   export function calculateComparison(input: IrishPropertyInput, city: CityData): ComparisonResult
//   export const PINT_PRICE_EUR = 6.5
//
// The engine in this worktree still has the OLD signature
// (parseIrishPropertyInput returns IrishPropertyInput directly, and there is
// no ParseResult type / PINT_PRICE_EUR export). These tests are written
// against the NEW contract on purpose — they are expected to fail (and may
// fail to typecheck) until Agent A's rewrite lands. The `as unknown as`
// casts and `@ts-expect-error` below exist solely to keep this file
// compiling against the old shape so `npm run build` / `tsc --noEmit` stay
// green; remove them once the real ParseResult-returning engine is merged.
import {
  calculateComparison,
  parseIrishPropertyInput,
  PINT_PRICE_EUR,
} from './comparatorEngine';

// --- New-contract type, duplicated here because the old engine doesn't export it yet. ---
interface ParseResult {
  input: IrishPropertyInput;
  extracted: { price: boolean; beds: boolean; area: boolean };
  isUrl: boolean;
  warning?: string;
}

/**
 * Thin wrapper that calls the real parseIrishPropertyInput but types its
 * result as the NEW contract (ParseResult), rather than the old engine's
 * `IrishPropertyInput` return type. This is the single integration seam:
 * once Agent A ships the real ParseResult-returning function, this cast
 * becomes a no-op and can be deleted.
 */
function parse(rawInput: string, fallbackInput: IrishPropertyInput): ParseResult {
  // TODO(integration): drop this cast once parseIrishPropertyInput returns
  // ParseResult natively.
  return parseIrishPropertyInput(rawInput, fallbackInput) as unknown as ParseResult;
}

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

  it('keeps estimatedSqM, estimatedSqFt and spaceMultiplier internally consistent (1 m2 = 10.7639 sq ft)', () => {
    const city = makeCity({ pricePerSqM: 4000 });
    const result = calculateComparison(fallback, city);

    expect(result.estimatedSqFt).toBeCloseTo(result.estimatedSqM * 10.7639, 0);

    const expectedMultiplier = result.estimatedSqFt / (fallback.sqft || 900);
    expect(result.spaceMultiplier).toBeCloseTo(expectedMultiplier, 1);
  });
});

describe('PINT_PRICE_EUR', () => {
  it('is set to 6.5', () => {
    expect(PINT_PRICE_EUR).toBe(6.5);
  });
});
