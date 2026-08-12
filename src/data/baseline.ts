/**
 * Dublin baseline data — the reference point every city comparison is measured against.
 *
 * This is the authoritative source for the Dublin figures used across the app.
 * `sunnyDaysPerYear` is consumed by comparatorEngine.calculateComparison and
 * rendered by CityDetailModal.
 *
 * Exchange rates are NOT here: they live in src/data/generated/fx.ts, refreshed
 * from the ECB's free daily feed via tools/ingest/fetchEcbRates.ts.
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
 * Historical note. Until 2026-08-10 the exchange rates were hardcoded per city and
 * roughly 18 months stale — EUR/USD sat at 1.09 against ~1.1555 actual (~6% out) and
 * EUR/CAD at 1.48 against ~1.6108 (~8.8% out). That error was larger than the effect
 * of any modelling improvement layered on top of it, so rates moved to the ECB's free
 * daily feed. See src/data/generated/fx.ts for the live values and their quote date,
 * and tools/ingest/fetchEcbRates.ts for the refresh.
 */
