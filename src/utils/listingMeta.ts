/**
 * Client side of the OG listing fetch.
 *
 * The rule this module exists to enforce: OG data may only ever UPGRADE what we
 * know. A field is marked as read if — and only if — the fetched metadata
 * actually supplied it. An OG response that lacks floor area leaves floor area
 * assumed, and the card keeps saying so.
 *
 * Parsing the fetched text reuses parseIrishPropertyInput rather than
 * reimplementing price/bed/area detection, so there stays exactly one place in
 * the codebase that understands property text.
 */
import type { IrishPropertyInput, ParseResult } from '../types';
import { parseIrishPropertyInput } from './comparatorEngine';

export interface ListingMetaFields {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  priceAmount?: string;
  priceCurrency?: string;
}

export type ListingMetaResponse =
  | { ok: true; source: 'og'; fields: ListingMetaFields; fetchedAt: string }
  | { ok: false; reason: string; message: string };

/** POSTs to our own function. Never called with anything but the user's own paste. */
export async function fetchListingMeta(url: string, signal?: AbortSignal): Promise<ListingMetaResponse | null> {
  try {
    const res = await fetch('/api/listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });
    return (await res.json()) as ListingMetaResponse;
  } catch {
    // Offline, blocked, or the function is not deployed. The local parse stands.
    return null;
  }
}

/**
 * Folds fetched metadata into a local parse result.
 *
 * `local` is authoritative for anything OG does not supply, so a failed or empty
 * fetch is a no-op rather than a regression.
 */
export function mergeListingMeta(local: ParseResult, meta: ListingMetaResponse | null): ParseResult {
  if (!meta || !meta.ok) return local;

  const { title, description, priceAmount, priceCurrency } = meta.fields;

  // Run the existing parser over the listing's own words. Far richer than a slug:
  // "3 bed Terraced House for sale at 14 Oak Road, Dublin 12, EUR 425,000".
  const text = [title, description].filter(Boolean).join(' — ');
  const fromText = text ? parseIrishPropertyInput(text, local.input) : null;

  const input: IrishPropertyInput = { ...local.input };
  const extracted = { ...local.extracted };

  if (fromText) {
    if (fromText.extracted.price) {
      input.priceEur = fromText.input.priceEur;
      extracted.price = true;
    }
    if (fromText.extracted.beds) {
      input.beds = fromText.input.beds;
      extracted.beds = true;
    }
    if (fromText.extracted.area) {
      input.sqft = fromText.input.sqft;
      extracted.area = true;
    }
  }

  // A machine-readable price beats one scraped out of prose, but only in EUR —
  // converting a GBP asking price here would silently corrupt the comparison.
  const amount = priceAmount ? Number(String(priceAmount).replace(/[^\d.]/g, '')) : NaN;
  if (Number.isFinite(amount) && amount >= 50_000 && amount <= 20_000_000) {
    if (!priceCurrency || /^eur$/i.test(priceCurrency)) {
      input.priceEur = Math.round(amount);
      extracted.price = true;
    }
  }

  if (title) input.title = title;

  const readAnything = extracted.price || extracted.beds || extracted.area;

  return {
    ...local,
    input,
    extracted,
    // Clear the local "couldn't read that link" warning only if we genuinely
    // learned something; otherwise the user still needs to be told.
    warning: readAnything ? undefined : local.warning,
  };
}
