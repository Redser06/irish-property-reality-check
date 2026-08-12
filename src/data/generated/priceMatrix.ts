// GENERATED FILE — do not edit by hand.
// Regenerate with: npx tsx tools/ingest/buildPriceMatrix.ts
//
// Property-KIND price bands for cities where an official source splits houses
// from apartments. Cities absent from this map fall back to their flat
// pricePerSqM, which resolvePriceBand() handles as 'city-default'.
//
// Every band here is 'indexed', not 'measured': the underlying register records
// prices but not floor areas, so EUR/m2 is a median price divided by an assumed
// typical floor area. The assumption is spelled out in each source string.
import type { PriceBand, PropertyKind } from '../../types';

export interface GeneratedKindBands {
  byKind: Partial<Record<PropertyKind, PriceBand>>;
}

export const KIND_BANDS: Record<string, GeneratedKindBands> = {
  galway: {
    byKind: {
      detached: {
        pricePerSqM: 4151,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Galway City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      semi: {
        pricePerSqM: 4151,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Galway City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      terrace: {
        pricePerSqM: 4151,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Galway City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      apartment: {
        pricePerSqM: 4685,
        basis: 'apartment',
        source: 'CSO PxStat HPM05 median apartment price for Galway City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical apartment floor area of 75 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
    },
  },
  limerick: {
    byKind: {
      detached: {
        pricePerSqM: 3037,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Limerick City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      semi: {
        pricePerSqM: 3037,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Limerick City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      terrace: {
        pricePerSqM: 3037,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Limerick City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      apartment: {
        pricePerSqM: 2898,
        basis: 'apartment',
        source: 'CSO PxStat HPM05 median apartment price for Limerick City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical apartment floor area of 75 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
    },
  },
  cork: {
    byKind: {
      detached: {
        pricePerSqM: 3358,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Cork City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      semi: {
        pricePerSqM: 3358,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Cork City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      terrace: {
        pricePerSqM: 3358,
        basis: 'house',
        source: 'CSO PxStat HPM05 median house price for Cork City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical house floor area of 110 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
      apartment: {
        pricePerSqM: 3959,
        basis: 'apartment',
        source: 'CSO PxStat HPM05 median apartment price for Cork City (2025 June to 2026 May mean of monthly medians, market-based household purchases), divided by an assumed typical apartment floor area of 75 m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '2026-08-12',
        confidence: 'indexed',
        sampleSize: 12,
      },
    },
  },
};
