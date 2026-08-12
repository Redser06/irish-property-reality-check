/**
 * The travel-time zone axis.
 *
 * Comparing "Dublin" with "Paris" is close to meaningless — Paris where? A D12
 * semi is not comparable to the 11th arrondissement; it is comparable to
 * Montreuil. The honest comparison holds urban position constant: your ring
 * against their ring.
 *
 * Two things this module is careful about:
 *
 * 1. The zone is named by TIME, not by density words like "inner suburb",
 *    because time is what it measures and density vocabulary would imply a
 *    judgement we are not making.
 *
 * 2. Travel time swings roughly 2x by mode — 45 minutes from central London by
 *    Tube covers far more ground than 45 minutes from Galway by bus. Any zone
 *    figure must therefore carry the mode it was measured on, which is why
 *    ZONE_TRAVEL_BASIS exists rather than a bare number.
 */
import type { UrbanZone } from '../types';

export interface ZoneOption {
  id: UrbanZone;
  label: string;
  /** What this ring feels like, in the user's own terms. */
  hint: string;
}

export const ZONE_OPTIONS: readonly ZoneOption[] = [
  { id: 't0_15', label: 'Under 15 min', hint: 'City centre or right beside it' },
  { id: 't15_30', label: '15–30 min', hint: 'Inner suburbs' },
  { id: 't30_45', label: '30–45 min', hint: 'Outer suburbs' },
  { id: 't45_60', label: '45–60 min', hint: 'Edge of the city' },
  { id: 'beyond', label: 'Over an hour', hint: 'Commuter belt' },
];

export const ZONE_LABEL: Record<UrbanZone, string> = Object.fromEntries(
  ZONE_OPTIONS.map((z) => [z.id, z.label]),
) as Record<UrbanZone, string>;

/**
 * How zone assignments are measured, whenever a city gains zone data.
 *
 * Deliberately a single shared constant: if one city's zones were derived on
 * drive time and another's on transit time, comparing the two rings would be
 * comparing nothing at all.
 */
export const ZONE_TRAVEL_BASIS = {
  mode: 'transit' as const,
  departure: 'weekday-0800',
  note: 'Typical public-transport journey time to the city centre on a weekday morning.',
};

/**
 * Rough Dublin routing-key hints, used ONLY to pre-select the zone dropdown for
 * a user who typed a Dublin postal district. This is a convenience, not data:
 * it never feeds a price band, and the user can override it.
 */
const DUBLIN_DISTRICT_ZONE: Record<string, UrbanZone> = {
  '1': 't0_15', '2': 't0_15', '7': 't0_15', '8': 't0_15',
  '3': 't15_30', '4': 't15_30', '6': 't15_30', '9': 't15_30', '6w': 't15_30',
  '5': 't30_45', '10': 't30_45', '11': 't30_45', '12': 't30_45', '14': 't30_45', '20': 't30_45',
  '13': 't45_60', '15': 't45_60', '16': 't45_60', '17': 't45_60', '18': 't45_60',
  '22': 't45_60', '24': 't45_60',
};

/** Best guess at the user's ring from free-text location. Returns undefined when unsure. */
export function suggestZoneFromLocation(location: string | undefined): UrbanZone | undefined {
  if (!location) return undefined;
  const text = location.trim().toLowerCase();

  const dublin = text.match(/\bdublin\s*(\d{1,2}w?)\b/);
  if (dublin) return DUBLIN_DISTRICT_ZONE[dublin[1]];

  if (/\bco\.?\s|county\b|commuter/.test(text)) return 'beyond';
  if (/city centre|city center|\bcbd\b/.test(text)) return 't0_15';

  return undefined;
}
