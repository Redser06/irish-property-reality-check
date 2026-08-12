/**
 * Rewrites the deprecated `exchangeRateFromEur` literals in citiesData.ts so they
 * agree with the generated ECB artifact.
 *
 *   npx tsx tools/ingest/syncCityFxLiterals.ts
 *
 * The engine reads FX_RATES, not these literals — but leaving two disagreeing
 * numbers in the repo is how the price/m2 basis defect happened. An invariant
 * test enforces that they match; this script is how you make them match.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { FX_RATES } from '../../src/data/generated/fx.ts';

const DATA = new URL('../../src/data/citiesData.ts', import.meta.url);

const src = await readFile(DATA, 'utf8');

let changed = 0;
// Each city literal declares `currency` a few lines above `exchangeRateFromEur`.
const out = src.replace(
  /(currency: '([A-Z]{3})',\n(?:.*\n)*?\s*exchangeRateFromEur: )([\d.]+)(,)/g,
  (_full, head: string, code: string, current: string, tail: string) => {
    const rate = FX_RATES[code as keyof typeof FX_RATES];
    if (rate === undefined) throw new Error(`No FX rate for ${code}`);
    if (Number(current) !== rate) changed += 1;
    return `${head}${rate}${tail}`;
  },
);

await writeFile(DATA, out, 'utf8');
console.log(`Synced exchangeRateFromEur literals — ${changed} changed.`);
