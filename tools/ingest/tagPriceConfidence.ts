/**
 * Stamps pricePerSqMConfidence onto every city, derived from what its source
 * string actually says.
 *
 *   npx tsx tools/ingest/tagPriceConfidence.ts
 *
 *   measured  — recorded transactions (land registry, notarial data, Redfin medians)
 *   indexed   — asking prices or crowd-sourced aggregates (Numbeo, Idealista, agency reports)
 *   estimated — editorial judgement, not sourced
 */
import { readFile, writeFile } from 'node:fs/promises';

const DATA = new URL('../../src/data/citiesData.ts', import.meta.url);

const MEASURED = /land registry|notarial|dvf|redfin|propertyshark|ons|housemetric|plumplot|notaires/i;
const INDEXED = /numbeo|idealista|bayut|driven properties|property monitor|meilleurs agents/i;
const ESTIMATED = /editorial estimate/i;

function classify(source: string): 'measured' | 'indexed' | 'estimated' {
  // Order matters: an editorial estimate that *mentions* a rejected Numbeo figure
  // is still an editorial estimate.
  if (ESTIMATED.test(source)) return 'estimated';
  if (MEASURED.test(source)) return 'measured';
  if (INDEXED.test(source)) return 'indexed';
  return 'estimated';
}

const src = await readFile(DATA, 'utf8');
const counts: Record<string, number> = { measured: 0, indexed: 0, estimated: 0 };

const out = src.replace(
  /( {4}pricePerSqMSource: '([^']*)',\n)( {4}pricePerSqMAsOf: '[^']*',\n)( {4}pricePerSqMConfidence: '[^']*',\n)?/g,
  (_full, sourceLine: string, sourceText: string, asOfLine: string) => {
    const confidence = classify(sourceText);
    counts[confidence] += 1;
    return `${sourceLine}${asOfLine}    pricePerSqMConfidence: '${confidence}',\n`;
  },
);

await writeFile(DATA, out, 'utf8');
console.log('Tagged price confidence:', counts);
