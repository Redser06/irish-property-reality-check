/**
 * Dublin baseline data — the reference point every city comparison is measured against.
 *
 * This is the authoritative source for the Dublin figures used across the app
 * (currently hardcoded as the literal `140` in src/utils/comparatorEngine.ts and
 * src/components/CityDetailModal.tsx — wiring those to import from here is a
 * follow-up change, out of scope for this file per the remediation brief).
 */
export const DUBLIN_BASELINE = {
  /**
   * "Sunny days per year" is a popular/informal figure, not an official Met Éireann
   * metric — Met Éireann and the CSO publish average annual SUNSHINE HOURS, not a
   * "sunny day" count. The closest official proxy is Dublin Airport's 1991–2020
   * long-term average of ~1,400 sunshine hours/year (Met Éireann Sunshine climate
   * data, https://www.met.ie/climate/what-we-measure/sunshine). 140 is retained as
   * the long-standing editorial estimate used throughout this app; it is directionally
   * consistent with that hours figure but should not be read as an official statistic.
   */
  sunnyDaysPerYear: 140,
  // €6,400/m² — average of Numbeo Dublin's city-centre (€7,795.33/m²) and
  // outside-centre (€5,066.90/m²) apartment purchase prices, 237 entries /
  // 50 contributors, last updated 2026-08-07. Cross-checked against Daft.ie's
  // Q1 2026 Sales Report and the CSO Residential Property Price Index, both of
  // which put the Dublin average in the same €5,500–€6,500/m² band.
  pricePerSqM: 6400,
  source: 'Numbeo Dublin property price data (numbeo.com/property-investment/in/Dublin), cross-checked against Daft.ie Q1 2026 Sales Report and CSO Residential Property Price Index',
  asOf: '2026-08-07',
} as const;

/**
 * FX_AS_OF documents when the exchange rates in citiesData.ts were roughly
 * accurate. The rates themselves were NOT changed as part of this pass — a later
 * phase moves them to the ECB's free daily feed. This date is an ESTIMATE, derived
 * from internal consistency, not a verified capture date:
 *   - exchangeRateFromEur for USD is 1.09
 *   - exchangeRateFromEur for AED is 4.00, which equals 1.09 × 3.6725 (the fixed
 *     AED/USD peg), confirming the AED rate was derived FROM the 1.09 USD rate
 *   - EUR/USD last traded consistently around 1.09 in late Jan / early Feb 2025
 *     (it opened 2025 near 1.03–1.04 and rose from there); it has not been at
 *     1.09 since, trading at ~1.13 for most of 2025 and ~1.15–1.16 by Aug 2026
 *
 * STALENESS CHECK (as of 2026-08-09, today's actual mid-market rates):
 *   - EUR/USD: file says 1.09, actual ≈1.1555 → file is ~6% stale (EUR understated)
 *   - EUR/GBP: file says 0.85, actual ≈0.857 → close, ~1% stale
 *   - EUR/AUD: file says 1.65, actual ≈1.638 → close, <1% stale
 *   - EUR/CAD: file says 1.48, actual ≈1.617 → file is ~9% stale (largest gap)
 *   - EUR/AED: file says 4.00, actual ≈4.244 (via USD peg) → ~6% stale, tracks USD
 * GBP and AUD are still reasonably close to today's real rates; USD, AED, and
 * especially CAD have drifted materially and should be prioritised when this
 * moves to a live ECB feed.
 */
export const FX_AS_OF = '2025-02-01';
