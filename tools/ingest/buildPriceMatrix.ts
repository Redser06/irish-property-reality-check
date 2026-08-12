/**
 * Builds src/data/generated/priceMatrix.ts — the property-KIND axis.
 *
 *   npx tsx tools/ingest/buildPriceMatrix.ts
 *
 * Source: CSO PxStat table HPM05, "Market-based Household Purchases of
 * Residential Dwellings" — median sale price by dwelling type (House /
 * Apartment) by region. Free, keyless, official, and current.
 *
 * WHY A RATIO OF MEDIANS, NOT A MEDIAN OF RATIOS
 * The register has no floor area, so a true per-property EUR/m2 is not
 * derivable from it. We divide a median price by a typical floor area for that
 * dwelling type instead. That is a weaker statistic — it cannot see the spread
 * — so every band it produces is stamped confidence: 'indexed', never
 * 'measured', and the floor-area assumption is written into the source string
 * the UI displays. Anyone reading a card can see exactly what was assumed.
 */
import { writeFile, mkdir } from 'node:fs/promises';

const HPM05 = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM05/JSON-stat/2.0/en';

/**
 * Typical floor areas used to turn a median PRICE into a median PRICE PER M2.
 *
 * These are assumptions, not measurements, and they are the weakest link in this
 * pipeline — which is why they are declared here in one place, cited in every
 * generated source string, and cap the output confidence at 'indexed'.
 *
 * Basis: Irish dwelling stock averages — a typical suburban house sits near
 * 110 m2 and a typical apartment near 75 m2. Revisit if SEAI's BER research
 * dataset becomes reachable without a form submission; that would give measured
 * medians by dwelling type and routing key, and would upgrade these bands.
 */
const TYPICAL_FLOOR_AREA_SQM = { house: 110, apartment: 75 } as const;

/** CSO region label -> our city id. Only cities we can source this way. */
const REGION_TO_CITY: Record<string, string> = {
  'Galway City': 'galway',
  'Limerick City': 'limerick',
  'Cork City': 'cork',
};

/** Months of data to average, to damp the noise in a thin monthly city series. */
const WINDOW_MONTHS = 12;

interface JsonStat {
  id: string[];
  size: number[];
  value: Record<string, number> | (number | null)[];
  dimension: Record<string, { category: { index: Record<string, number> | string[]; label: Record<string, string> } }>;
}

function categoryKeys(ds: JsonStat, dim: string): string[] {
  const index = ds.dimension[dim].category.index;
  if (Array.isArray(index)) return index;
  return Object.keys(index).sort((a, b) => index[a] - index[b]);
}

/** JSON-stat stores an n-dimensional cube flattened row-major. */
function valueAt(ds: JsonStat, coords: number[]): number | null {
  let offset = 0;
  for (let i = 0; i < coords.length; i += 1) {
    offset = offset * ds.size[i] + coords[i];
  }
  const v = Array.isArray(ds.value) ? ds.value[offset] : ds.value[String(offset)];
  return typeof v === 'number' ? v : null;
}

async function main(): Promise<void> {
  const res = await fetch(HPM05, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`CSO returned HTTP ${res.status}`);
  const ds = (await res.json()) as JsonStat;

  const [statDim, timeDim, typeDim, statusDim, filingDim, regionDim] = ds.id;

  const stats = categoryKeys(ds, statDim);
  const times = categoryKeys(ds, timeDim);
  const types = categoryKeys(ds, typeDim);
  const statuses = categoryKeys(ds, statusDim);
  const filings = categoryKeys(ds, filingDim);
  const regions = categoryKeys(ds, regionDim);

  const labelOf = (dim: string, key: string) => ds.dimension[dim].category.label[key];

  const medianIdx = stats.findIndex((s) => /median/i.test(labelOf(statDim, s)));
  const allStatusIdx = statuses.findIndex((s) => /all dwelling statuses/i.test(labelOf(statusDim, s)));
  const executionsIdx = filings.findIndex((f) => /executions/i.test(labelOf(filingDim, f)));
  const houseIdx = types.findIndex((t) => /^house$/i.test(labelOf(typeDim, t)));
  const apartmentIdx = types.findIndex((t) => /^apartment$/i.test(labelOf(typeDim, t)));

  if ([medianIdx, allStatusIdx, executionsIdx, houseIdx, apartmentIdx].some((i) => i < 0)) {
    throw new Error('HPM05 shape changed — expected Median Price / All Dwelling Statuses / Executions / House / Apartment');
  }

  const windowIdxs = times.map((_, i) => i).slice(-WINDOW_MONTHS);
  const windowLabel = `${labelOf(timeDim, times[windowIdxs[0]])} to ${labelOf(timeDim, times[windowIdxs[windowIdxs.length - 1]])}`;

  /** Mean of the non-null monthly medians in the window. */
  function medianPrice(regionIdx: number, typeIdx: number): number | null {
    const samples: number[] = [];
    for (const t of windowIdxs) {
      const v = valueAt(ds, [medianIdx, t, typeIdx, allStatusIdx, executionsIdx, regionIdx]);
      if (v !== null && v > 0) samples.push(v);
    }
    if (samples.length === 0) return null;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  const entries: string[] = [];
  const report: string[] = [];

  for (const [regionLabel, cityId] of Object.entries(REGION_TO_CITY)) {
    const regionIdx = regions.findIndex((r) => labelOf(regionDim, r) === regionLabel);
    if (regionIdx < 0) {
      report.push(`${cityId}: SKIPPED — region "${regionLabel}" not present in HPM05`);
      continue;
    }

    const housePrice = medianPrice(regionIdx, houseIdx);
    const aptPrice = medianPrice(regionIdx, apartmentIdx);

    if (housePrice === null && aptPrice === null) {
      report.push(`${cityId}: SKIPPED — no median data in the last ${WINDOW_MONTHS} months`);
      continue;
    }

    const bands: string[] = [];

    /**
     * CSO splits only House vs Apartment, which is coarser than our four-way kind
     * axis. A CSO "House" figure therefore populates detached, semi AND terrace
     * with the same number and the same citation — pretending we can tell a
     * terrace from a detached here would be inventing precision the source does
     * not have. The source string says "median house price", so a reader can see
     * exactly that.
     */
    const mk = (
      kinds: readonly string[],
      csoType: 'house' | 'apartment',
      price: number | null,
    ): string[] => {
      if (price === null) return [];
      const area = TYPICAL_FLOOR_AREA_SQM[csoType];
      const perSqM = Math.round(price / area);
      report.push(
        `${cityId}.${csoType} -> [${kinds.join(', ')}]: median EUR ${Math.round(price).toLocaleString()} / ${area} m2 = EUR ${perSqM}/m2`,
      );
      return kinds.map(
        (kind) => `      ${kind}: {
        pricePerSqM: ${perSqM},
        basis: '${csoType}',
        source: 'CSO PxStat HPM05 median ${csoType} price for ${regionLabel} (${windowLabel} mean of monthly medians, market-based household purchases), divided by an assumed typical ${csoType} floor area of ${area} m2. CSO does not distinguish detached from semi-detached or terraced, so all three share this figure.',
        asOf: '${new Date().toISOString().slice(0, 10)}',
        confidence: 'indexed',
        sampleSize: ${windowIdxs.length},
      },`,
      );
    };

    bands.push(...mk(['detached', 'semi', 'terrace'], 'house', housePrice));
    bands.push(...mk(['apartment'], 'apartment', aptPrice));

    entries.push(`  ${cityId}: {
    byKind: {
${bands.join('\n')}
    },
  },`);
  }

  const out = `// GENERATED FILE — do not edit by hand.
// Regenerate with: npx tsx tools/ingest/buildPriceMatrix.ts
//
// Property-KIND price bands for cities where an official source splits houses
// from apartments. Cities absent from this map fall back to their flat
// pricePerSqM, which resolvePriceBand() handles as 'city-default'.
//
// Every band here is 'indexed', not 'measured': the underlying register records
// prices but not floor areas, so EUR/m2 is a median price divided by an assumed
// typical floor area. The assumption is spelled out in each source string.
import type { PriceBand, PropertyKind } from '../../types';

export interface GeneratedKindBands {
  byKind: Partial<Record<PropertyKind, PriceBand>>;
}

export const KIND_BANDS: Record<string, GeneratedKindBands> = {
${entries.join('\n')}
};
`;

  const target = new URL('../../src/data/generated/priceMatrix.ts', import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, out, 'utf8');

  console.log(`Window: ${windowLabel}`);
  report.forEach((r) => console.log('  ' + r));
  console.log(`\nWrote priceMatrix.ts with ${entries.length} cities.`);
}

main().catch((err) => {
  console.error('Price matrix ingest failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
