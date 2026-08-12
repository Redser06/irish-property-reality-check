import {
  BandSelection,
  CityData,
  ComparisonResult,
  FieldConfidence,
  InputConfidence,
  IrishPropertyInput,
  ParseResult,
  PriceBand,
  PropertyKind,
  ResultProvenance,
  UrbanZone,
} from '../types';
import { DUBLIN_BASELINE } from '../data/baseline';
import { FX_RATES } from '../data/generated/fx';
import { SQFT_PER_SQM, sqFtToSqM, sqMToSqFt } from './units';
import { calculateOwnership } from './ownership';

/** Price of a pint of Guinness used for the "pints of space value" metric. */
export const PINT_PRICE_EUR = 6.5;

/**
 * Assumed floor area when the user's own is unknown. Every comparison on the
 * page divides by this, so it is never silently correct — callers must treat a
 * falsy `input.sqft` as an assumption and say so in the UI.
 */
export const FALLBACK_INPUT_SQFT = 900;

/**
 * Live ECB rate for the city's currency, falling back to the (deprecated)
 * per-city literal if a currency ever appears that the FX artifact lacks.
 */
export function resolveFxRate(city: CityData): number {
  return FX_RATES[city.currency] ?? city.exchangeRateFromEur;
}

// A residential asking price we are willing to believe.
const MIN_PLAUSIBLE_PRICE = 50_000;
const MAX_PLAUSIBLE_PRICE = 20_000_000;

const MIN_BEDS = 1;
const MAX_BEDS = 15;

// Floor-area sanity bounds.
const MIN_SQFT = 100;
const MAX_SQFT = 20_000;
const MIN_SQM = 10;
const MAX_SQM = 2_000;

/**
 * Scans a whole string for every number that could be a price and returns the
 * most credible one.
 *
 * Tiers, best first:
 *   0. currency-marked  — "€600,000", "EUR 600000", "€600k"
 *   1. k/m-suffixed     — "600k", "1.2m"  (suffix must be ADJACENT to the digits,
 *                         so the "k" in "Kinsale" can never act as a multiplier)
 *   2. bare number      — "750000"  (only when `allowBare`, i.e. never inside a URL,
 *                         where bare digit runs are listing IDs and Dublin postcodes)
 *
 * Within a tier the first match wins. Anything outside the plausible range is
 * discarded rather than clamped.
 */
function scanForPrice(text: string, allowBare: boolean): number | null {
  const re = /(€|\beur\b)?[\s:=]{0,2}(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)(k|m)?(?![a-z0-9])/gi;
  let best: { tier: number; value: number } | null = null;

  for (const match of text.matchAll(re)) {
    const hasCurrencyMark = Boolean(match[1]);
    const suffix = match[3] ? match[3].toLowerCase() : '';

    let value = Number(match[2].replace(/[,\s]/g, ''));
    if (!Number.isFinite(value)) continue;
    if (suffix === 'k') value *= 1_000;
    if (suffix === 'm') value *= 1_000_000;
    value = Math.round(value);

    if (value < MIN_PLAUSIBLE_PRICE || value > MAX_PLAUSIBLE_PRICE) continue;

    const tier = hasCurrencyMark ? 0 : suffix ? 1 : 2;
    if (tier === 2 && !allowBare) continue;

    if (!best || tier < best.tier) best = { tier, value };
  }

  return best ? best.value : null;
}

/** Matches "3 bed", "3-bed", "3bed", "3 bedroom", "3 beds", "3br". */
function scanForBeds(text: string): number | null {
  const match = text.match(/(\d{1,2})[\s-]*(?:bed(?:room)?s?|br)\b/i);
  if (!match) return null;
  const beds = parseInt(match[1], 10);
  if (!Number.isFinite(beds) || beds < MIN_BEDS || beds > MAX_BEDS) return null;
  return beds;
}

const AREA_NUMBER = String.raw`(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)`;
// NB: the trailing guard is a negative lookahead, not `\b` — `\b` cannot follow
// the non-word characters in "m²" / "ft²", which silently broke those units.
const SQFT_RE = new RegExp(
  AREA_NUMBER + String.raw`\s*(?:sq\.?\s*(?:ft|feet)|sqft|ft\.?\s*2|ft²|square\s*(?:ft|feet))(?![a-z0-9])`,
  'i'
);
const SQM_RE = new RegExp(
  AREA_NUMBER +
    String.raw`\s*(?:sq\.?\s*m(?:et(?:re|er)s?|tr?s?)?|sqm|m\s*2|m²|square\s*met(?:re|er)s?)(?![a-z0-9])`,
  'i'
);

/** Extracts a floor area and normalises it to square feet. */
function scanForAreaSqFt(text: string): number | null {
  const sqftMatch = text.match(SQFT_RE);
  if (sqftMatch) {
    const value = Number(sqftMatch[1].replace(/[,\s]/g, ''));
    if (Number.isFinite(value) && value >= MIN_SQFT && value <= MAX_SQFT) {
      return Math.round(value);
    }
  }

  const sqmMatch = text.match(SQM_RE);
  if (sqmMatch) {
    const value = Number(sqmMatch[1].replace(/[,\s]/g, ''));
    if (Number.isFinite(value) && value >= MIN_SQM && value <= MAX_SQM) {
      return Math.round(value * SQFT_PER_SQM);
    }
  }

  return null;
}

/** `new URL()` throws on things like "http://" — this never does. */
function safeParseUrl(candidate: string): URL | null {
  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Parses free text or a Daft.ie / MyHome.ie listing URL into property details.
 *
 * Guarantees:
 *  - never throws, for any string input (including "http://" and "");
 *  - never silently reports a fallback value as if it had been read from the
 *    input — see `ParseResult.extracted` and `ParseResult.warning`;
 *  - does no network access. A listing URL is mined for whatever its slug and
 *    query string happen to reveal, and nothing more.
 */
export function parseIrishPropertyInput(rawInput: string, fallbackInput: IrishPropertyInput): ParseResult {
  const cleanStr = (rawInput || '').replace(/[\u00a0\u2007\u202f]/g, ' ').trim();

  const extracted = { price: false, beds: false, area: false };

  if (!cleanStr) {
    return { input: fallbackInput, extracted, isUrl: false, warning: undefined };
  }

  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(cleanStr);
  const parsedUrl = looksLikeUrl ? safeParseUrl(cleanStr) : null;

  let price: number | null = null;
  let beds: number | null = null;
  let areaSqFt: number | null = null;
  let title = fallbackInput.title;
  let warning: string | undefined;

  if (looksLikeUrl) {
    if (parsedUrl) {
      // Query params are the only place a URL states a price unambiguously.
      for (const [key, value] of Array.from(parsedUrl.searchParams.entries())) {
        if (price !== null) break;
        if (!/price|budget/i.test(key)) continue;
        price = scanForPrice(value, true);
      }

      // The slug can still carry "€600k"-style markers, beds and floor area.
      const slugText = safeDecode(`${parsedUrl.pathname} ${parsedUrl.search}`).replace(/[-_/+]/g, ' ');
      if (price === null) price = scanForPrice(slugText, false);
      beds = scanForBeds(slugText);
      areaSqFt = scanForAreaSqFt(slugText);

      title = `Property from ${parsedUrl.hostname}`;
    } else {
      warning = "That link didn't look complete — enter the details manually below.";
    }
  } else {
    price = scanForPrice(cleanStr, true);
    beds = scanForBeds(cleanStr);
    areaSqFt = scanForAreaSqFt(cleanStr);
    title = cleanStr.length > 5 ? cleanStr : fallbackInput.title;
  }

  extracted.price = price !== null;
  extracted.beds = beds !== null;
  extracted.area = areaSqFt !== null;

  const gotNothing = !extracted.price && !extracted.beds && !extracted.area;
  if (gotNothing && !warning) {
    warning = looksLikeUrl
      ? "Couldn't read the details from that link — enter them manually below."
      : "Couldn't find a price, bed count or floor area in that — enter the details manually below.";
  }

  const input: IrishPropertyInput = {
    ...fallbackInput,
    priceEur: price ?? fallbackInput.priceEur,
    beds: beds ?? fallbackInput.beds,
    sqft: areaSqFt ?? fallbackInput.sqft,
    url: parsedUrl ? cleanStr : undefined,
    title
  };

  return { input, extracted, isUrl: looksLikeUrl, warning };
}

/**
 * Normalises the free-text propertyType into the kind axis.
 *
 * Order matters: "Semi-Detached" contains "detached", so semi must be tested
 * first or every semi in the dataset silently prices as a detached house.
 */
export function normalisePropertyKind(propertyType: string | undefined): PropertyKind | undefined {
  if (!propertyType) return undefined;
  const t = propertyType.toLowerCase();
  if (/\bsemi\b|semi-?detached/.test(t)) return 'semi';
  if (/terrace/.test(t)) return 'terrace';
  if (/apart|flat|flatlet|condo|duplex|studio/.test(t)) return 'apartment';
  if (/detached|bungalow|villa|cottage|house/.test(t)) return 'detached';
  return undefined;
}

/** Input confidence used when a caller has no better information (e.g. a preset). */
export const PRESET_INPUT_CONFIDENCE: InputConfidence = {
  price: 'preset',
  beds: 'preset',
  area: 'preset',
  source: 'preset',
};

/**
 * Picks the best available price band for what the caller asked for, and reports
 * how far it had to fall back.
 *
 * The ladder is: exact (zone + kind) -> zone-only -> kind-only -> city default ->
 * synthesised from the flat legacy fields. That last rung is what lets cities with
 * no price matrix work with no data migration: every result gets a band, always.
 */
export function resolvePriceBand(
  city: CityData,
  want: { kind?: PropertyKind; zone?: UrbanZone } = {},
): BandSelection {
  const matrix = city.priceMatrix;
  const requested = { kind: want.kind, zone: want.zone };

  if (matrix) {
    const zoneBands = want.zone ? matrix.byZone?.[want.zone] : undefined;

    if (zoneBands && want.kind) {
      const band = zoneBands.byKind?.[want.kind];
      if (band) {
        return { requested, resolved: { kind: want.kind, zone: want.zone }, fallbackLevel: 'exact', band };
      }
    }
    if (zoneBands) {
      return { requested, resolved: { zone: want.zone }, fallbackLevel: 'zone-only', band: zoneBands.all };
    }
    if (want.kind) {
      const band = matrix.byKind?.[want.kind];
      if (band) {
        return { requested, resolved: { kind: want.kind }, fallbackLevel: 'kind-only', band };
      }
    }
    return { requested, resolved: {}, fallbackLevel: 'city-default', band: matrix.default };
  }

  // No matrix: synthesise a band from the flat legacy fields so downstream code
  // never has to special-case "this city has no matrix".
  return {
    requested,
    resolved: {},
    fallbackLevel: 'city-default',
    band: {
      pricePerSqM: city.pricePerSqM,
      basis: city.pricePerSqMBasis ?? 'blended',
      source: city.pricePerSqMSource ?? 'Unsourced editorial estimate',
      asOf: city.pricePerSqMAsOf ?? 'unknown',
      confidence: city.pricePerSqMConfidence ?? 'estimated',
    },
  };
}

const CONFIDENCE_RANK: Record<'high' | 'medium' | 'low', number> = { high: 2, medium: 1, low: 0 };

function bandConfidenceLevel(band: PriceBand): 'high' | 'medium' | 'low' {
  if (band.confidence === 'measured') return 'high';
  if (band.confidence === 'indexed') return 'medium';
  return 'low';
}

function areaConfidenceLevel(area: FieldConfidence): 'high' | 'medium' | 'low' {
  if (area === 'read' || area === 'entered') return 'high';
  if (area === 'preset') return 'medium';
  return 'low';
}

/**
 * Rolls confidence up as the weakest link.
 *
 * Floor area dominates deliberately: it is the divisor on both sides of
 * spaceMultiplier, so an assumed area makes every derived figure on the card soft
 * no matter how good the city's price data is.
 */
function buildProvenance(band: BandSelection, input: InputConfidence): ResultProvenance {
  const caveats: string[] = [];

  const levels: Array<'high' | 'medium' | 'low'> = [
    bandConfidenceLevel(band.band),
    areaConfidenceLevel(input.area),
    band.fallbackLevel === 'exact' ? 'high' : 'medium',
  ];

  if (input.area === 'assumed') {
    caveats.push('Floor area was assumed, not read — every space figure here moves if you correct it');
  } else if (input.area === 'preset') {
    caveats.push('Floor area comes from the sample property, not your own');
  }
  if (input.price === 'assumed') caveats.push('Price was not read from your input');
  if (band.band.confidence === 'estimated') caveats.push('This city has an editorial price estimate, not sourced data');
  else if (band.band.confidence === 'indexed') caveats.push('Priced on asking-price/aggregate data rather than recorded sales');
  if (band.fallbackLevel === 'city-default' && (band.requested.zone || band.requested.kind)) {
    caveats.push('No matching property type or area data for this city — using the city average');
  }

  const overall = levels.reduce((worst, l) => (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[worst] ? l : worst), 'high' as const);

  return { band, input, overall, caveats };
}

/**
 * Calculates comparison analytics for a given city and Irish property input.
 */
export function calculateComparison(
  input: IrishPropertyInput,
  city: CityData,
  options?: { inputConfidence?: InputConfidence },
): ComparisonResult {
  const inputConfidence = options?.inputConfidence ?? PRESET_INPUT_CONFIDENCE;
  const kind = input.kind ?? normalisePropertyKind(input.propertyType);
  const bandSelection = resolvePriceBand(city, { kind, zone: input.zone });
  const convertedPrice = Math.round(input.priceEur * resolveFxRate(city));

  // Space the budget buys at this city's price per m2. Both outputs are derived
  // from the SAME exact value — rounding m2 first and then converting would
  // compound the error into the sq ft figure.
  const exactSqM = input.priceEur / bandSelection.band.pricePerSqM;
  const estimatedSqM = Math.round(exactSqM);
  const estimatedSqFt = Math.round(sqMToSqFt(exactSqM));

  // Calculate estimated rooms based on sqFt
  const estimatedBeds = Math.max(1, Math.round(estimatedSqFt / 350));
  const estimatedBaths = Math.max(1, Math.round(estimatedBeds * 0.8));

  // Space multiplier compared to user's Irish property
  const inputSqFt = input.sqft || FALLBACK_INPUT_SQFT;
  const inputSqM = sqFtToSqM(inputSqFt);
  const spaceMultiplier = parseFloat((sqMToSqFt(exactSqM) / inputSqFt).toFixed(1));

  // Sunny days relative to the Dublin baseline (single source of truth).
  const sunnyDaysDiff = city.sunnyDaysPerYear - DUBLIN_BASELINE.sunnyDaysPerYear;

  // Remorse Index (clamped 5-99). Three additive components:
  //   base                30 points
  //   space    up to  +45 / -25  (more room than home = more remorse)
  //   weather  up to  +30 / -30  (symmetric: 200 extra sunny days = +30,
  //                               200 fewer = -30, so a wetter city is
  //                               visibly penalised rather than ignored)
  let remorseScore = 30;

  if (spaceMultiplier > 1.0) {
    remorseScore += Math.min(45, (spaceMultiplier - 1.0) * 20);
  } else {
    remorseScore -= Math.min(25, (1.0 - spaceMultiplier) * 30);
  }

  remorseScore += Math.max(-30, Math.min(30, (sunnyDaysDiff / 200) * 30));

  // Cap remorse index between 5 and 99
  const remorseIndex = Math.max(5, Math.min(99, Math.round(remorseScore)));

  // Remorse Label
  let remorseLabel = 'Mild Curiosity';
  if (remorseIndex >= 85) {
    remorseLabel = 'Existential Breakdown & Immediate Relocation';
  } else if (remorseIndex >= 70) {
    remorseLabel = 'Severe Buyer\'s Remorse';
  } else if (remorseIndex >= 50) {
    remorseLabel = 'Heavy Envy & Crying in Barry\'s Tea';
  } else if (remorseIndex >= 30) {
    remorseLabel = 'Slight Smugness / Tolerable Trade-Off';
  } else {
    remorseLabel = 'At Least You Have Dublin/Irish Craic!';
  }

  // Guinness metric: the MONEY VALUE of the extra space, expressed in pints.
  //   extra m2 x local EUR/m2 = EUR of extra space; / pint price = pints.
  // Negative when the city gives you less space than home, which is the honest
  // answer (the space is worth that many pints less) — consumers should render
  // the sign rather than assume a "+".
  const extraSqM = estimatedSqM - inputSqM;
  const guinnessEquivPints = Math.round((extraSqM * bandSelection.band.pricePerSqM) / PINT_PRICE_EUR);

  // Perk highlight based on space & sun
  let highlightedPerk = city.samplePerks[0];
  if (spaceMultiplier >= 2.0) {
    highlightedPerk = `${spaceMultiplier}x larger living space with private grounds`;
  } else if (sunnyDaysDiff >= 100) {
    highlightedPerk = `${city.sunnyDaysPerYear} sunny days a year vs Irish rain`;
  }

  // Google search URL pre-formatted
  const googleSearchQuery = `${estimatedBeds} bedroom house for sale ${city.name} ${city.currencySymbol}${convertedPrice.toLocaleString()}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}`;

  return {
    city,
    convertedPrice,
    estimatedSqM,
    estimatedSqFt,
    estimatedBeds,
    estimatedBaths,
    spaceMultiplier,
    remorseIndex,
    remorseLabel,
    sunnyDaysDiff,
    guinnessEquivPints,
    highlightedPerk,
    googleSearchUrl,
    portalSearchUrl: city.portalSearchUrl,
    provenance: buildProvenance(bandSelection, inputConfidence),
    // Costed on the space the budget actually buys THERE, not on the Irish
    // property's floor area — a bigger house costs more to heat and insure.
    ownership: city.costs ? calculateOwnership(input.priceEur, estimatedSqM, kind, city.costs) : undefined
  };
}
