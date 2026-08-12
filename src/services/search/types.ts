/**
 * Search-backed proof listings.
 *
 * The modelled number says "your budget buys 4,230 sq ft in Puglia". The proof
 * is three actual listings next to it. This module defines the shape without
 * committing to a vendor.
 *
 * THE ECONOMIC CONSTRAINT DRIVES THE DESIGN. This is a viral tool with spiky
 * traffic — one good post is 100k sessions in a day. A per-user API call at even
 * $1/1,000 is survivable, but a per-user *scrape* is not. So results are cached
 * per (city, spec-bucket), never per user, and a cold bucket degrades instead of
 * blocking.
 */
import type { PropertyKind, UrbanZone } from '../../types';

export interface ProofQuery {
  cityId: string;
  budgetEur: number;
  beds?: number;
  kind?: PropertyKind;
  zone?: UrbanZone;
}

export interface ProofListing {
  id: string;
  title: string;
  priceLocal: number;
  currency: string;
  areaSqM?: number;
  beds?: number;
  kind?: PropertyKind;
  url: string;
  imageUrl?: string;
  sourceName: string;
  capturedAt: string;
}

export type ProofState =
  | { status: 'ready'; listings: ProofListing[]; bucket: string }
  /** Cache miss. The card shows the modelled figure and says listings are coming. */
  | { status: 'warming'; bucket: string }
  /** Daily budget spent. Degrades to the portal links the card already has. */
  | { status: 'quota' }
  | { status: 'unavailable' };

export interface SearchProvider {
  readonly name: string;
  search(query: ProofQuery, signal?: AbortSignal): Promise<ProofListing[]>;
}
