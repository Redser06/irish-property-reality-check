/**
 * Open Graph extraction. Pure string work — no DOM, no network, no execution.
 *
 * We only ever read the document head, and we only keep a small set of known
 * fields. Nothing here interprets the page: turning "3 bed ... €425,000" into
 * numbers is left to the existing, already-tested parser on the client, so
 * there is exactly one place in the codebase that understands property text.
 */

export interface OgFields {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  /** Some portals expose a machine-readable price; most do not. */
  priceAmount?: string;
  priceCurrency?: string;
}

/** Cap on any single captured value, so a hostile page cannot bloat our response. */
const MAX_FIELD_CHARS = 500;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', pound: '£',
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function clean(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD_CHARS);
}

/**
 * Truncate to the head. A listing page body is large and irrelevant to us, and
 * not parsing it is both faster and one less place to get something wrong.
 */
export function extractHead(html: string, maxChars = 128_000): string {
  const closing = html.search(/<\/head\s*>/i);
  const end = closing === -1 ? Math.min(html.length, maxChars) : closing;
  return html.slice(0, Math.min(end, maxChars));
}

const META_TAG = /<meta\b[^>]*>/gi;
const ATTR = (name: string) => new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');

function attrValue(tag: string, name: string): string | undefined {
  const m = tag.match(ATTR(name));
  if (!m) return undefined;
  return m[2] ?? m[3] ?? m[4];
}

/** Maps both `property=` (OG spec) and `name=` (what many CMSes actually emit). */
const FIELD_BY_KEY: Record<string, keyof OgFields> = {
  'og:title': 'title',
  'og:description': 'description',
  'og:image': 'imageUrl',
  'og:image:secure_url': 'imageUrl',
  'og:site_name': 'siteName',
  'product:price:amount': 'priceAmount',
  'og:price:amount': 'priceAmount',
  'product:price:currency': 'priceCurrency',
  'og:price:currency': 'priceCurrency',
  'twitter:title': 'title',
  'twitter:description': 'description',
  'twitter:image': 'imageUrl',
  description: 'description',
};

export function extractOgFields(html: string): OgFields {
  const head = extractHead(html);
  const fields: OgFields = {};

  for (const tag of head.match(META_TAG) ?? []) {
    const key = (attrValue(tag, 'property') ?? attrValue(tag, 'name'))?.toLowerCase();
    if (!key) continue;

    const field = FIELD_BY_KEY[key];
    if (!field) continue;

    const raw = attrValue(tag, 'content');
    if (!raw) continue;

    const value = clean(raw);
    // First writer wins: og:title should beat a later twitter:title.
    if (value && fields[field] === undefined) fields[field] = value;
  }

  // Fall back to <title> when the page has no og:title at all.
  if (!fields.title) {
    const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) {
      const value = clean(t[1]);
      if (value) fields.title = value;
    }
  }

  // Only ever hand back an https image URL. We do not proxy the bytes.
  if (fields.imageUrl && !/^https:\/\//i.test(fields.imageUrl)) {
    delete fields.imageUrl;
  }

  return fields;
}
