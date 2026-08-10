export type RegionCategory = 'All' | 'Ireland' | 'UK & Europe' | 'North America' | 'Middle East' | 'Australia';
export type LaneFilter = 'all' | 'lane1' | 'lane2';

export type CurrencyCode = 'EUR' | 'GBP' | 'USD' | 'AUD' | 'CAD' | 'AED';

export interface IrishPropertyInput {
  url?: string;
  title: string;
  priceEur: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  propertyType: string;
  berRating: string;
  features: string[];
}

/**
 * Result of parsing a raw user input string (free text or a listing URL).
 *
 * `extracted` reports, per field, whether the value in `input` was ACTUALLY read
 * from the raw input. A `false` flag means the value was inherited from the
 * fallback, so the UI must not present it as something it understood.
 */
export interface ParseResult {
  input: IrishPropertyInput;
  extracted: { price: boolean; beds: boolean; area: boolean };
  isUrl: boolean;
  warning?: string;
}

export interface CityData {
  id: string;
  name: string;
  country: string;
  flagEmoji: string;
  region: 'Ireland' | 'UK & Europe' | 'North America' | 'Middle East' | 'Australia';
  lane: 1 | 2;
  currency: CurrencyCode;
  currencySymbol: string;
  /**
   * @deprecated Legacy fallback only. The live rate comes from
   * `src/data/generated/fx.ts`, refreshed from the ECB feed — see
   * `resolveFxRate()` in comparatorEngine. Kept so existing city literals and
   * tests keep compiling; an invariant test asserts the two agree.
   */
  exchangeRateFromEur: number; // 1 EUR in target currency
  pricePerSqM: number; // Average price in EUR per m2
  pricePerSqMSource?: string; // Named, checkable citation for pricePerSqM
  pricePerSqMAsOf?: string; // YYYY-MM-DD date the pricePerSqM figure was sourced
  /**
   * WHAT pricePerSqM measures. Apartment €/m² runs well above house €/m² in the
   * same city, because a house spreads its price over more floor area — so mixing
   * bases across cities silently corrupts the comparison. Record it per city and
   * keep it consistent with `typicalBuilding`: a city whose archetype is a
   * detached house should not be priced on apartment data.
   */
  pricePerSqMBasis?: 'house' | 'apartment' | 'all-dwellings' | 'blended';
  typicalBuilding: string;
  sunnyDaysPerYear: number;
  averageSummerTempC: number;
  samplePerks: string[];
  imageUrl: string;
  portalName: string;
  sarcasticQuote: string;
  searchKeywords: string;
  portalSearchUrl: string;
  fxAsOf?: string; // YYYY-MM-DD the exchangeRateFromEur figure was accurate
}

export interface ComparisonResult {
  city: CityData;
  convertedPrice: number;
  estimatedSqM: number;
  estimatedSqFt: number;
  estimatedBeds: number;
  estimatedBaths: number;
  spaceMultiplier: number;
  remorseIndex: number; // 0 to 100
  remorseLabel: string;
  sunnyDaysDiff: number;
  guinnessEquivPints: number;
  highlightedPerk: string;
  googleSearchUrl: string;
  portalSearchUrl: string;
}

export interface PresetProperty {
  id: string;
  label: string;
  description: string;
  input: IrishPropertyInput;
}
