/**
 * POST /api/listing  { "url": "https://www.daft.ie/for-sale/..." }
 *
 * Reads the Open Graph tags of ONE listing page the user pasted, so the app can
 * pre-fill their property instead of making them type it. This is a link
 * preview, not a crawler: the host allowlist in _lib/urlGuard means it can only
 * ever be aimed at a handful of property portals, one page at a time, at a
 * user's explicit request.
 *
 * It deliberately needs no API key, so compromising it leaks nothing.
 *
 * Degradation is the expected path, not the exception — portals block datacentre
 * IPs and their OG tags rarely carry floor area. The client keeps its own parse
 * result and treats anything here as a bonus.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { request } from 'node:https';
import { lookup as dnsLookup } from 'node:dns/promises';
import { extractOgFields, type OgFields } from './_lib/og';
import { isPrivateAddress, REJECTION_MESSAGES, validateListingUrl, type RejectReason } from './_lib/urlGuard';

const MAX_BODY_BYTES = 2_048; // request body
const MAX_RESPONSE_BYTES = 512 * 1024; // streamed cap on the page
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5_000;

export type ListingFailure = RejectReason | 'timeout' | 'too-large' | 'bad-content-type' | 'upstream-error' | 'no-og' | 'too-many-redirects';

export type ListingResponse =
  | { ok: true; source: 'og'; fields: OgFields; fetchedAt: string }
  | { ok: false; reason: ListingFailure; message: string };

const FAILURE_MESSAGES: Record<string, string> = {
  ...REJECTION_MESSAGES,
  timeout: "That listing took too long to respond — enter the details manually below.",
  'too-large': 'That page was too big to read safely.',
  'bad-content-type': "That link didn't return a web page.",
  'upstream-error': "The listing site wouldn't let us read that page — enter the details manually below.",
  'no-og': "We reached the page but it didn't publish any details we could read.",
  'too-many-redirects': 'That link redirected too many times.',
};

function fail(reason: ListingFailure): ListingResponse {
  return { ok: false, reason, message: FAILURE_MESSAGES[reason] ?? 'We could not read that link.' };
}

/**
 * Resolve the host and refuse any private/link-local/metadata address, then PIN
 * the connection to the address we validated.
 *
 * Without pinning, the check is a TOCTOU window: an attacker's DNS can answer
 * public on our lookup and private on the socket's own lookup moments later.
 */
async function resolvePinnedAddress(hostname: string): Promise<{ address: string; family: number } | null> {
  const results = await dnsLookup(hostname, { all: true });
  if (results.length === 0) return null;
  // ALL answers must be safe — one poisoned record is enough to matter.
  if (results.some((r) => isPrivateAddress(r.address))) return null;
  return { address: results[0].address, family: results[0].family };
}

type LookupOneCallback = (err: Error | null, address: string, family: number) => void;
type LookupAllCallback = (err: Error | null, addresses: Array<{ address: string; family: number }>) => void;
type LookupCallback = LookupOneCallback | LookupAllCallback;

interface FetchOutcome {
  status: number;
  location?: string;
  contentType?: string;
  body?: string;
  failure?: ListingFailure;
}

function fetchOnce(url: URL, pinned: { address: string; family: number }): Promise<FetchOutcome> {
  return new Promise((resolve) => {
    const req = request(
      {
        protocol: 'https:',
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        servername: url.hostname, // SNI must follow the name, not the pinned IP
        // Pin: whatever DNS says later, this socket goes to the address we vetted.
        //
        // Node calls this with `{ all: true }` and expects an ARRAY back; older
        // callers expect (err, address, family). Honour both — getting this wrong
        // fails as "Invalid IP address: undefined", which looks like the remote
        // host blocking us rather than a bug on our side.
        lookup: (_hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
          if (options && options.all) {
            (callback as LookupAllCallback)(null, [{ address: pinned.address, family: pinned.family }]);
          } else {
            (callback as LookupOneCallback)(null, pinned.address, pinned.family);
          }
        },
        headers: {
          // Identify honestly. A tool that hides what it is has decided it is doing
          // something it should not.
          'User-Agent': 'IrishPropertyRealityCheck/1.0 (+link preview; one page per user request)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-IE,en;q=0.9',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers['content-type'] ?? '');

        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, location: String(res.headers.location ?? '') });
          return;
        }
        if (status >= 400) {
          res.resume();
          resolve({ status, failure: 'upstream-error' });
          return;
        }
        if (!/^(text\/html|application\/xhtml\+xml)/i.test(contentType)) {
          res.destroy();
          resolve({ status, failure: 'bad-content-type' });
          return;
        }
        // Content-Length is a hint, never trust it — enforce while streaming.
        const declared = Number(res.headers['content-length'] ?? 0);
        if (declared > MAX_RESPONSE_BYTES) {
          res.destroy();
          resolve({ status, failure: 'too-large' });
          return;
        }

        let received = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            res.destroy();
            resolve({ status, failure: 'too-large' });
            return;
          }
          chunks.push(chunk);
          // Stop as soon as the head is complete — the body is of no interest.
          if (Buffer.concat(chunks).includes('</head>')) res.destroy();
        });
        res.on('close', () => resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', () => resolve({ status, failure: 'upstream-error' }));
      },
    );

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve({ status: 0, failure: 'timeout' });
    });
    req.on('error', () => resolve({ status: 0, failure: 'upstream-error' }));
    req.end();
  });
}

/** Follows redirects manually, re-validating every hop against the full guard. */
export async function fetchListingMeta(rawUrl: string): Promise<ListingResponse> {
  let verdict = validateListingUrl(rawUrl);
  if (!verdict.ok) return fail(verdict.reason);

  let current = verdict.url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const pinned = await resolvePinnedAddress(current.hostname).catch(() => null);
    if (!pinned) return fail('private-address');

    const outcome = await fetchOnce(current, pinned);
    if (outcome.failure) return fail(outcome.failure);

    if (outcome.location) {
      const next = new URL(outcome.location, current).toString();
      // Re-run EVERY check on the new target. Auto-following is the classic bypass.
      verdict = validateListingUrl(next);
      if (!verdict.ok) return fail(verdict.reason);
      current = verdict.url;
      continue;
    }

    const fields = extractOgFields(outcome.body ?? '');
    if (!fields.title && !fields.description && !fields.imageUrl) return fail('no-og');

    return { ok: true, source: 'og', fields, fetchedAt: new Date().toISOString() };
  }

  return fail('too-many-redirects');
}

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify(fail('bad-url')));
    return;
  }

  let url: unknown;
  try {
    const body = await readBody(req);
    url = (JSON.parse(body) as { url?: unknown }).url;
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify(fail('bad-url')));
    return;
  }

  if (typeof url !== 'string' || url.length > 2_000) {
    res.statusCode = 400;
    res.end(JSON.stringify(fail('bad-url')));
    return;
  }

  const result = await fetchListingMeta(url);

  // Log the host and the outcome only. Full URLs carry query strings, and query
  // strings carry personal data.
  let host = 'unparseable';
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep the placeholder */
  }
  console.log(JSON.stringify({ at: 'api/listing', host, ok: result.ok, reason: result.ok ? null : result.reason }));

  // Cache successes at the edge: the same listing pasted by several people costs
  // one origin fetch. Failures are not cached — they are often transient blocks.
  res.setHeader('Cache-Control', result.ok ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'no-store');
  res.statusCode = result.ok ? 200 : 422;
  res.end(JSON.stringify(result));
}
