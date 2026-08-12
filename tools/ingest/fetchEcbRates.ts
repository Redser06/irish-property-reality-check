/**
 * Regenerates src/data/generated/fx.ts from the ECB daily reference rates.
 *
 *   npx tsx tools/ingest/fetchEcbRates.ts
 *
 * The ECB feed is free, keyless, and published every working day around 16:00 CET.
 * It does NOT quote AED, which is pegged to the US dollar at a fixed 3.6725 —
 * so AED is derived from the USD rate rather than invented.
 *
 * Output is a .ts file rather than .json on purpose: it is typed against
 * CurrencyCode, so `tsc --noEmit` in CI validates the generated artifact for free.
 */

const ECB_DAILY = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

/** USD per AED is fixed by the UAE central bank; AED is not in the ECB feed. */
const AED_PER_USD = 3.6725;

const WANTED = ['USD', 'GBP', 'AUD', 'CAD'] as const;

interface EcbSnapshot {
  date: string;
  rates: Record<string, number>;
}

async function fetchEcbDaily(): Promise<EcbSnapshot> {
  const res = await fetch(ECB_DAILY, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`ECB returned HTTP ${res.status}`);
  const xml = await res.text();

  const date = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  if (!date) throw new Error('Could not find a quote date in the ECB response');

  const rates: Record<string, number> = {};
  for (const m of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    rates[m[1]] = Number(m[2]);
  }
  if (Object.keys(rates).length === 0) throw new Error('Parsed zero rates from the ECB response');

  return { date, rates };
}

function render({ date, rates }: EcbSnapshot): string {
  const missing = WANTED.filter((c) => !Number.isFinite(rates[c]));
  if (missing.length) throw new Error(`ECB feed is missing: ${missing.join(', ')}`);

  const aed = Number((rates.USD * AED_PER_USD).toFixed(4));

  const lines = [
    `  EUR: 1,`,
    ...WANTED.map((c) => `  ${c}: ${rates[c]},`),
    `  // Derived: ECB does not quote AED. USD rate x the fixed ${AED_PER_USD} AED/USD peg.`,
    `  AED: ${aed},`,
  ].join('\n');

  return `// GENERATED FILE — do not edit by hand.
// Regenerate with: npx tsx tools/ingest/fetchEcbRates.ts
import type { CurrencyCode } from '../../types';

/** Units of the target currency per 1 EUR. */
export const FX_RATES: Record<CurrencyCode, number> = {
${lines}
};

/** Quote date of the ECB reference rates above (YYYY-MM-DD). */
export const FX_AS_OF = '${date}';

export const FX_SOURCE =
  'European Central Bank euro foreign exchange reference rates (free daily feed, no API key). AED derived via the fixed ${AED_PER_USD} AED/USD peg.';
`;
}

async function main(): Promise<void> {
  const snapshot = await fetchEcbDaily();
  const out = new URL('../../src/data/generated/fx.ts', import.meta.url);
  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(new URL('.', out), { recursive: true });
  await writeFile(out, render(snapshot), 'utf8');
  console.log(`Wrote fx.ts — ECB rates as of ${snapshot.date}`);
}

main().catch((err) => {
  console.error('FX ingest failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
