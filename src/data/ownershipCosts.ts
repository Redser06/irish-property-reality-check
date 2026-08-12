/**
 * Cost of buying and holding, by country.
 *
 * These are COUNTRY-level figures applied to each city in that country, which is
 * a real simplification: recurring property tax is genuinely sub-city almost
 * everywhere (US mill rates vary by county, UK council tax by band and borough,
 * French taxe foncière by commune). Every entry is therefore 'indexed' at best,
 * and the UI shows that alongside the number.
 *
 * The point of this layer is not precision. It is that sticker price is a bad
 * guide to what a place actually costs: US recurring property tax runs 1-2.5% of
 * value a year against Ireland's LPT at roughly 0.1%, a difference large enough
 * to reorder the whole board.
 *
 * Energy is modelled as typical consumption for the local housing stock. The
 * user's Irish BER is deliberately NOT propagated abroad — we have no idea what
 * rating the equivalent Manchester house holds, and pretending otherwise would
 * be inventing a building.
 */
import type { CityCosts } from '../types';

type CountryCosts = Omit<CityCosts, 'source' | 'asOf' | 'confidence'> & {
  source: string;
  asOf: string;
  confidence: CityCosts['confidence'];
};

const IE: CountryCosts = {
  purchase: {
    // Irish stamp duty: 1% to EUR 1m, 2% on the balance to 1.5m, 6% above.
    transferTax: {
      model: 'bands',
      bands: [
        { upToEur: 1_000_000, ratePct: 1 },
        { upToEur: 1_500_000, ratePct: 2 },
        { upToEur: null, ratePct: 6 },
      ],
    },
    fixedFeesEur: 3_500,
  },
  holding: {
    // Local Property Tax is banded and works out near 0.1% of value.
    recurringPropertyTax: { model: 'rate-of-value', ratePct: 0.1 },
    serviceChargeEurPerSqMYear: 22,
    insuranceEurPerYear: 550,
    energy: { typicalKWhPerSqMYear: 150, eurPerKWh: 0.33 },
  },
  source: 'Irish stamp duty rates (Revenue), Local Property Tax banding, and typical Irish domestic electricity unit rates',
  asOf: '2026-08-12',
  confidence: 'indexed',
};

const UK: CountryCosts = {
  purchase: {
    // Stamp Duty Land Tax, expressed against EUR thresholds for comparability.
    transferTax: {
      model: 'bands',
      bands: [
        { upToEur: 145_000, ratePct: 0 },
        { upToEur: 300_000, ratePct: 2 },
        { upToEur: 1_100_000, ratePct: 5 },
        { upToEur: null, ratePct: 10 },
      ],
    },
    fixedFeesEur: 2_800,
  },
  holding: {
    // Council tax is a flat band charge, not a percentage of value.
    recurringPropertyTax: { model: 'flat', annualEur: 2_300 },
    serviceChargeEurPerSqMYear: 25,
    insuranceEurPerYear: 400,
    energy: { typicalKWhPerSqMYear: 140, eurPerKWh: 0.29 },
  },
  source: 'UK Stamp Duty Land Tax bands, typical Band D council tax, and typical domestic energy unit rates',
  asOf: '2026-08-12',
  confidence: 'indexed',
};

const US: CountryCosts = {
  purchase: {
    transferTax: { model: 'flat-pct', ratePct: 1.0 },
    fixedFeesEur: 4_500,
  },
  holding: {
    // The headline: US recurring property tax is an order of magnitude above
    // Ireland's. This single line reorders the comparison.
    recurringPropertyTax: { model: 'rate-of-value', ratePct: 1.4 },
    serviceChargeEurPerSqMYear: 30,
    insuranceEurPerYear: 1_600,
    energy: { typicalKWhPerSqMYear: 200, eurPerKWh: 0.15 },
  },
  source: 'Typical US effective property tax rate (varies materially by state and county), plus typical closing costs, homeowner insurance and residential electricity rates',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const AU: CountryCosts = {
  purchase: {
    transferTax: { model: 'flat-pct', ratePct: 4.5 },
    fixedFeesEur: 2_500,
  },
  holding: {
    recurringPropertyTax: { model: 'flat', annualEur: 1_900 },
    serviceChargeEurPerSqMYear: 28,
    insuranceEurPerYear: 900,
    energy: { typicalKWhPerSqMYear: 170, eurPerKWh: 0.21 },
  },
  source: 'Australian state stamp duty (typical mid-range rate), council rates, and typical residential electricity tariffs',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const CA: CountryCosts = {
  purchase: {
    transferTax: { model: 'flat-pct', ratePct: 2.0 },
    fixedFeesEur: 2_600,
  },
  holding: {
    recurringPropertyTax: { model: 'rate-of-value', ratePct: 0.7 },
    serviceChargeEurPerSqMYear: 45,
    insuranceEurPerYear: 900,
    energy: { typicalKWhPerSqMYear: 220, eurPerKWh: 0.12 },
  },
  source: 'Canadian provincial land transfer tax (typical), municipal property tax rates, and typical residential electricity rates',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const AE: CountryCosts = {
  purchase: {
    transferTax: { model: 'flat-pct', ratePct: 4.0 },
    fixedFeesEur: 3_000,
  },
  holding: {
    // No recurring property tax — the headline attraction, and a real one.
    recurringPropertyTax: { model: 'none' },
    serviceChargeEurPerSqMYear: 40,
    insuranceEurPerYear: 500,
    // Cooling-dominated: without this term the Gulf looks implausibly cheap.
    energy: { typicalKWhPerSqMYear: 300, eurPerKWh: 0.09 },
  },
  source: 'UAE property transfer fee (4% Dubai Land Department), absence of recurring property tax, typical service charges and cooling-dominated electricity consumption',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const FR: CountryCosts = {
  purchase: {
    transferTax: { model: 'flat-pct', ratePct: 7.5 },
    fixedFeesEur: 1_500,
  },
  holding: {
    recurringPropertyTax: { model: 'flat', annualEur: 1_300 },
    serviceChargeEurPerSqMYear: 30,
    insuranceEurPerYear: 400,
    energy: { typicalKWhPerSqMYear: 145, eurPerKWh: 0.25 },
  },
  source: 'French frais de notaire on existing property, typical taxe foncière, and regulated electricity tariffs',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const ES: CountryCosts = {
  purchase: { transferTax: { model: 'flat-pct', ratePct: 8.0 }, fixedFeesEur: 2_000 },
  holding: {
    recurringPropertyTax: { model: 'rate-of-value', ratePct: 0.5 },
    serviceChargeEurPerSqMYear: 20,
    insuranceEurPerYear: 350,
    energy: { typicalKWhPerSqMYear: 130, eurPerKWh: 0.24 },
  },
  source: 'Spanish ITP transfer tax on resale property, IBI municipal property tax, and typical electricity tariffs',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

const IT: CountryCosts = {
  purchase: { transferTax: { model: 'flat-pct', ratePct: 9.0 }, fixedFeesEur: 2_500 },
  holding: {
    recurringPropertyTax: { model: 'rate-of-value', ratePct: 0.6 },
    serviceChargeEurPerSqMYear: 18,
    insuranceEurPerYear: 350,
    energy: { typicalKWhPerSqMYear: 130, eurPerKWh: 0.28 },
  },
  source: 'Italian imposta di registro on second-home purchase, IMU municipal tax, and typical electricity tariffs',
  asOf: '2026-08-12',
  confidence: 'estimated',
};

/** country label as it appears in citiesData -> cost profile */
export const COSTS_BY_COUNTRY: Record<string, CityCosts> = {
  Ireland: IE,
  'Northern Ireland': UK,
  England: UK,
  France: FR,
  Italy: IT,
  Spain: ES,
  Australia: AU,
  UAE: AE,
  Canada: CA,
  USA: US,
};
