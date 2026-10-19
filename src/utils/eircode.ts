/**
 * Irish Eircode helpers, ported from irish-property-compass `src/lib/eircode.ts`
 * (Lovable commit bccd75ae281e08b398074f00014215cd9f15ed7c).
 *
 * `countyFromRoutingKey` is the Compass map, unchanged. It is partial, and a
 * handful of keys disagree with the public routing-area list. Those keys are
 * listed in `ROUTING_KEY_COUNTY_MISMATCHES` so the UI can flag them. The map
 * was not "corrected" — routing keys are postal areas and can cross counties
 * (https://www.eircode.ie/what-is-eircode).
 */

export const EIRCODE_RE = /\b([A-Z]\d{2}|D6W)\s*[A-Z0-9]{4}\b/i;
export const ROUTING_KEY_RE = /\b([A-Z]\d{2}|D6W)\b/i;

export const IRISH_COUNTIES = [
  'Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Wicklow', 'Kildare',
  'Meath', 'Louth', 'Wexford', 'Kerry', 'Clare', 'Tipperary', 'Kilkenny',
  'Carlow', 'Laois', 'Offaly', 'Westmeath', 'Longford', 'Roscommon', 'Mayo',
  'Sligo', 'Leitrim', 'Donegal', 'Cavan', 'Monaghan',
] as const;

export interface RoutingKeyCountyMismatch {
  compassCounty: string;
  listedCounty: string;
  postTown: string;
  /** Where the disagreement was checked. */
  source: string;
}

/**
 * Compass says one county; the Wikipedia routing-area list says another.
 * Checked 2026-10-19 against
 * https://en.wikipedia.org/wiki/List_of_Eircode_routing_areas_in_Ireland
 * A92 also covers Laytown–Bettystown–Mornington in Co. Meath, so "Louth"
 * is the Drogheda post town, not the whole key.
 */
export const ROUTING_KEY_COUNTY_MISMATCHES: Record<string, RoutingKeyCountyMismatch> = {
  A82: { compassCounty: 'Dublin', listedCounty: 'Meath', postTown: 'Kells', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  A83: { compassCounty: 'Dublin', listedCounty: 'Meath', postTown: 'Enfield', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  A84: { compassCounty: 'Dublin', listedCounty: 'Meath', postTown: 'Ashbourne', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  A85: { compassCounty: 'Dublin', listedCounty: 'Meath', postTown: 'Dunshaughlin', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  A86: { compassCounty: 'Dublin', listedCounty: 'Meath', postTown: 'Dunboyne', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  A92: { compassCounty: 'Dublin', listedCounty: 'Louth', postTown: 'Drogheda', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
  Y25: { compassCounty: 'Wicklow', listedCounty: 'Wexford', postTown: 'Gorey', source: 'Wikipedia list of Eircode routing areas, 2026-10-19' },
};

export function extractRoutingKey(input: string | undefined | null): string | null {
  if (!input) return null;
  const m = input.toUpperCase().match(ROUTING_KEY_RE);
  return m ? m[1].toUpperCase() : null;
}

export function normalizeEircode(input: string | undefined | null): string | null {
  if (!input) return null;
  const m = input.toUpperCase().replace(/\s+/g, '').match(/^([A-Z]\d{2}|D6W)([A-Z0-9]{4})$/);
  return m ? `${m[1]} ${m[2]}` : null;
}

/** First Eircode embedded in a longer string, or null. */
export function findEircode(input: string | undefined | null): string | null {
  if (!input) return null;
  const m = input.toUpperCase().match(EIRCODE_RE);
  return m ? normalizeEircode(m[0]) : null;
}

export function extractCountyFromAddress(address: string | undefined | null): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  const found = IRISH_COUNTIES.find((c) => lower.includes(c.toLowerCase()));
  return found ?? null;
}

/**
 * Routing key → county. Ported as Compass wrote it, including the gaps and
 * the mismatches recorded above. Returns null when Compass had no opinion.
 */
export function countyFromRoutingKey(rk: string | null): string | null {
  if (!rk) return null;
  const key = rk.toUpperCase();
  if (key.startsWith('D') || key === 'D6W') return 'Dublin';
  if (['A63', 'A67', 'A98', 'Y14', 'Y25'].includes(key)) return 'Wicklow';
  if ([
    'A86', 'A82', 'A83', 'A84', 'A85', 'A41', 'A42', 'A45', 'A92', 'A94', 'A96',
    'K32', 'K34', 'K36', 'K45', 'K56', 'K67', 'K78',
  ].includes(key)) return 'Dublin';
  if (key.startsWith('W')) return 'Kildare';
  return null;
}
