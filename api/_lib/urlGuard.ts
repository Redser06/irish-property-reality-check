/**
 * SSRF guards for the listing fetcher.
 *
 * This module takes a URL supplied by an anonymous internet user and decides
 * whether the server may fetch it. Everything here is a PURE function with no
 * network access, so the whole security story is unit-testable against hostile
 * input without mocking anything.
 *
 * The controls are layered deliberately. The host allowlist is the primary one —
 * it means this function cannot be aimed at arbitrary infrastructure at all, and
 * it settles the "is this a crawler?" question definitively: it can only ever
 * read the handful of property portals a user might legitimately paste. The
 * address checks are defence-in-depth, and are what still protects us if the
 * allowlist is ever widened.
 */

export type RejectReason =
  | 'not-https'
  | 'bad-url'
  | 'userinfo-present'
  | 'non-default-port'
  | 'punycode-host'
  | 'not-allowed-host'
  | 'private-address';

export type UrlVerdict =
  | { ok: true; url: URL }
  | { ok: false; reason: RejectReason };

/**
 * Hosts we will fetch. Exact matches only — `daft.ie.evil.com` must not pass.
 * Going global later turns this into a per-country config table; it stays an
 * allowlist either way.
 */
export const ALLOWED_LISTING_HOSTS: ReadonlySet<string> = new Set([
  'daft.ie',
  'www.daft.ie',
  'myhome.ie',
  'www.myhome.ie',
  'propertypal.com',
  'www.propertypal.com',
  'rightmove.co.uk',
  'www.rightmove.co.uk',
  'zoopla.co.uk',
  'www.zoopla.co.uk',
  'onthemarket.com',
  'www.onthemarket.com',
]);

/** Lowercase and strip the legitimate-but-unusual trailing root dot. */
export function normaliseHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/**
 * Punycode hosts are rejected outright rather than decoded. `dаft.ie` with a
 * Cyrillic 'а' reaches us as `xn--dft-ncd.ie`; no legitimate paste of an Irish or
 * UK property portal needs an internationalised domain, so refusing the whole
 * class is safer than trying to detect homoglyphs.
 */
export function isPunycodeHost(host: string): boolean {
  return host.split('.').some((label) => label.startsWith('xn--'));
}

export function isAllowedListingHost(host: string): boolean {
  const normalised = normaliseHost(host);
  if (isPunycodeHost(normalised)) return false;
  return ALLOWED_LISTING_HOSTS.has(normalised);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    // Reject octal/hex/padded forms — 0x7f and 010 are classic bypasses.
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

const IPV4_BLOCKED: ReadonlyArray<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC1918
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. 169.254.169.254 cloud metadata
  ['172.16.0.0', 12], // RFC1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // RFC1918
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. 255.255.255.255
];

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // unparseable is not proven safe
  return IPV4_BLOCKED.some(([base, bits]) => {
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (baseInt & mask);
  });
}

/**
 * True for any address we refuse to connect to.
 *
 * Errs towards blocking: anything unparseable counts as private, because an
 * address we cannot reason about is not an address we should dial.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase();
  if (!ip) return true;

  // IPv4-mapped and IPv4-compatible IPv6 (::ffff:127.0.0.1) — judge the embedded v4.
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/) ?? ip.match(/^::(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  if (ip.includes(':')) {
    if (ip === '::' || ip === '::1') return true; // unspecified, loopback
    if (/^f[cd][0-9a-f]{2}:/.test(ip)) return true; // fc00::/7 unique-local
    if (/^fe[89ab][0-9a-f]:/.test(ip)) return true; // fe80::/10 link-local
    if (/^ff[0-9a-f]{2}:/.test(ip)) return true; // ff00::/8 multicast
    if (/^64:ff9b:/.test(ip)) return true; // NAT64
    if (/^2002:/.test(ip)) return true; // 6to4 can embed a private v4
    return false;
  }

  return isPrivateIpv4(ip);
}

/**
 * Full validation of a user-supplied listing URL. Runs on the original input AND
 * again on every redirect hop — following redirects without re-validating is the
 * classic way an allowlist gets bypassed.
 */
export function validateListingUrl(raw: string): UrlVerdict {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'bad-url' };
  }

  // https only. http:, data:, file:, ftp:, gopher:, blob: are all refused.
  if (url.protocol !== 'https:') return { ok: false, reason: 'not-https' };

  // https://daft.ie@evil.com — the host is evil.com, the rest is decoration.
  if (url.username || url.password) return { ok: false, reason: 'userinfo-present' };

  // Only the default port. An allowlisted host on :8080 is not the service we mean.
  if (url.port !== '' && url.port !== '443') return { ok: false, reason: 'non-default-port' };

  const host = normaliseHost(url.hostname);
  if (isPunycodeHost(host)) return { ok: false, reason: 'punycode-host' };
  if (!ALLOWED_LISTING_HOSTS.has(host)) return { ok: false, reason: 'not-allowed-host' };

  return { ok: true, url };
}

/** Human-readable, safe to show a user. Never leaks the URL back. */
export const REJECTION_MESSAGES: Record<RejectReason, string> = {
  'not-https': 'That link needs to be a secure https:// address.',
  'bad-url': "That didn't look like a web address.",
  'userinfo-present': "That link had login details embedded in it, so we didn't follow it.",
  'non-default-port': "That link pointed at an unusual port, so we didn't follow it.",
  'punycode-host': "That web address used characters we can't safely verify.",
  'not-allowed-host': 'We can only read links from Daft, MyHome, PropertyPal, Rightmove, Zoopla and OnTheMarket — enter the details manually instead.',
  'private-address': "That link resolved somewhere we won't connect to.",
};
