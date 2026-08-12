/**
 * Updates the flat pricePerSqM for cities where CSO now gives us a real figure
 * for that city's archetype, replacing the editorial estimates.
 *
 *   npx tsx tools/ingest/applyCsoDefaults.ts
 *
 * Galway, Limerick and Cork all have house archetypes ("Coastal Stone Cottage",
 * "Spacious Suburb Bungalow", "Victorian Hillside Villa"), so their headline
 * figure should be the CSO house band, not an editorial guess.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { KIND_BANDS } from '../../src/data/generated/priceMatrix.ts';

const ARCHETYPE_KIND: Record<string, 'house' | 'apartment'> = {
  galway: 'house',
  limerick: 'house',
  cork: 'house',
};

const DATA = new URL('../../src/data/citiesData.ts', import.meta.url);
let src = await readFile(DATA, 'utf8');
const changes: string[] = [];

for (const [cityId, kind] of Object.entries(ARCHETYPE_KIND)) {
  const band = KIND_BANDS[cityId]?.byKind?.[kind];
  if (!band) {
    console.error(`No ${kind} band for ${cityId} — skipping`);
    continue;
  }

  const block = new RegExp(
    `(id: '${cityId}',[\\s\\S]*?pricePerSqM: )(\\d+)(,\\n\\s*pricePerSqMSource: ')([^']*)(',\\n\\s*pricePerSqMAsOf: ')([^']*)(',\\n\\s*pricePerSqMConfidence: ')([^']*)(')`,
  );

  const before = src;
  src = src.replace(block, (_m, p1, oldPrice, p3, _oldSource, p5, _oldAsOf, p7, _oldConf, p9) => {
    changes.push(`${cityId}: ${oldPrice} -> ${band.pricePerSqM} (${kind} basis, CSO)`);
    return `${p1}${band.pricePerSqM}${p3}${band.source}${p5}${band.asOf}${p7}${band.confidence}${p9}`;
  });

  if (src === before) console.error(`Pattern did not match for ${cityId}`);
}

await writeFile(DATA, src, 'utf8');
console.log(changes.length ? changes.join('\n') : 'no changes');
