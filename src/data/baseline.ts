/**
 * Dublin reference point that every city is compared against.
 *
 * NOTE (Agent A): this is a MINIMAL placeholder created only so the comparator
 * engine can import a single source of truth instead of hardcoding `140`.
 * Agent B owns this file and their fuller version (with real sourcing) wins at
 * integration — keep the exported shape identical.
 */
export const DUBLIN_BASELINE: {
  sunnyDaysPerYear: number;
  pricePerSqM: number;
  source: string;
  asOf: string;
} = {
  sunnyDaysPerYear: 140,
  pricePerSqM: 5200,
  source: 'Placeholder pending sourced data',
  asOf: '2026-08'
};
