export type RegionCategory = 'All' | 'Ireland' | 'UK & Europe' | 'North America' | 'Middle East' | 'Australia';
export type LaneFilter = 'all' | 'lane1' | 'lane2';

export type CurrencyCode = 'EUR' | 'GBP' | 'USD' | 'AUD' | 'CAD' | 'AED';

export type PropertyKind = 'detached' | 'semi' | 'terrace' | 'apartment';

/** Travel-time band from the city centre. Named by time, because that is what it is. */
export type UrbanZone = 't0_15' | 't15_30' | 't30_45' | 't45_60' | 'beyond';

/**
 * How a price figure was arrived at.
 *   measured  — derived from recorded transactions (land registry, Redfin medians)
 *   indexed   — derived from asking prices or crowd-sourced aggregates (Numbeo, Idealista)
 *   estimated — editorial judgement, not sourced
 */
export type Confidence = 'measured' | 'indexed' | 'estimated';

export type PriceBasis = 'house' | 'apartment' | 'all-dwellings' | 'blended';

/** Where a single value in the user's input actually came from. */
export type FieldConfidence = 'read' | 'entered' | 'preset' | 'assumed';

export interface InputConfidence {
  price: FieldConfidence;
  beds: FieldConfidence;
  area: FieldConfidence;
  source: 'og' | 'url-slug' | 'free-text' | 'manual' | 'preset';
}

/** A price per m2 together with everything needed to judge whether to trust it. */
export interface PriceBand {
  pricePerSqM: number; // always EUR
  basis: PriceBasis;
  source: string;
  asOf: string;
  confidence: Confidence;
  sampleSize?: number;
}

/**
 * Bands for one travel-time zone. `all` always exists so a zone-only fallback is
 * well defined — without it the engine would have to average per-kind bands on the
 * fly, weighting a 3-sample detached cell equally with a 900-sample terrace cell.
 */
export interface ZoneBands {
  all: PriceBand;
  byKind?: Partial<Record<PropertyKind, PriceBand>>;
}

export interface CityPriceMatrix {
  /** Invariant: must equal CityData.pricePerSqM. Enforced by a test. */
  default: PriceBand;
  byKind?: Partial<Record<PropertyKind, PriceBand>>;
  byZone?: Partial<Record<UrbanZone, ZoneBands>>;
}

/* ---------------------------------------------------------------------------
 * Total cost of ownership
 * ------------------------------------------------------------------------ */

export interface TaxBand {
  /** Upper bound of this band in EUR; null means "and above". */
  upToEur: number | null;
  ratePct: number;
}

export type PurchaseTax =
  | { model: 'flat-pct'; ratePct: number }
  | { model: 'bands'; bands: TaxBand[] };

export type RecurringTax =
  /** A percentage of value each year — Irish LPT, US mill rates. */
  | { model: 'rate-of-value'; ratePct: number }
  /** A flat annual charge — UK council tax and similar, approximated. */
  | { model: 'flat'; annualEur: number }
  | { model: 'none' };

export interface CityCosts {
  purchase: {
    transferTax: PurchaseTax;
    /** Legal, survey, registration — the fees nobody budgets for. */
    fixedFeesEur: number;
  };
  holding: {
    recurringPropertyTax: RecurringTax;
    /** Applied to apartments only; houses rarely carry one. */
    serviceChargeEurPerSqMYear?: number;
    insuranceEurPerYear: number;
    /**
     * Energy modelled as typical consumption for THIS city's housing stock —
     * never by propagating the user's Irish BER abroad, which would be a guess
     * about a building that does not exist. Includes cooling where it dominates.
     */
    energy: { typicalKWhPerSqMYear: number; eurPerKWh: number };
  };
  source: string;
  asOf: string;
  confidence: Confidence;
}

export interface OwnershipCostLine {
  label: string;
  annualEur: number;
}

export interface OwnershipCost {
  /** Transfer tax plus fixed fees, paid once on the way in. */
  upfrontEur: number;
  annualEur: number;
  /** Nominal and undiscounted — the UI must say so. */
  tenYearTotalEur: number;
  breakdown: OwnershipCostLine[];
  confidence: Confidence;
  source: string;
}

/** Which band the engine actually used, and how far it had to fall back to find one. */
export interface BandSelection {
  requested: { kind?: PropertyKind; zone?: UrbanZone };
  resolved: { kind?: PropertyKind; zone?: UrbanZone };
  fallbackLevel: 'exact' | 'kind-only' | 'zone-only' | 'city-default';
  band: PriceBand;
}

export interface ResultProvenance {
  band: BandSelection;
  input: InputConfidence;
  /** Weakest link across the band and the input that fed it. */
  overall: 'high' | 'medium' | 'low';
  /** Short, human-readable reasons the confidence is not 'high'. */
  caveats: string[];
}

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
  /** Normalised from the free-text propertyType. Optional so presets stay valid. */
  kind?: PropertyKind;
  /** Travel-time band the property sits in. Set by the zone selector (Stage 5). */
  zone?: UrbanZone;
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
  pricePerSqMBasis?: PriceBasis;
  /** How the figure was derived. Absent is treated as 'estimated'. */
  pricePerSqMConfidence?: Confidence;
  /**
   * Dimensioned price data. Present only for Tier-1 cities with registry-derived
   * figures; everything else falls back to the flat pricePerSqM above.
   */
  priceMatrix?: CityPriceMatrix;
  /** Cost of buying and holding. Optional: absent means the card shows no TCO. */
  costs?: CityCosts;
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
  /**
   * How much to trust this row. Always produced — a comparison that cannot say
   * where its numbers came from is the defect this app already shipped once.
   */
  provenance: ResultProvenance;
  /** Present only for cities with a `costs` entry. */
  ownership?: OwnershipCost;
}

export interface PresetProperty {
  id: string;
  label: string;
  description: string;
  input: IrishPropertyInput;
}
