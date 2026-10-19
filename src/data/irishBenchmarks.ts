/**
 * Local €/m² benchmarks the fair-price check is allowed to use.
 *
 * Irish Property Compass fell back to unsourced flat rates when it had fewer
 * than five recent sales. Those rates are not used. A county is graded only
 * when this repo already publishes a sourced (or explicitly editorial) figure:
 * the Dublin baseline, or a Lane 1 city.
 */

import { CITIES_DATA } from './citiesData';
import { DUBLIN_BASELINE } from './baseline';
import type { CityData } from '../types';
import {
  countyFromRoutingKey,
  extractCountyFromAddress,
  extractRoutingKey,
  ROUTING_KEY_COUNTY_MISMATCHES,
  type RoutingKeyCountyMismatch,
} from '../utils/eircode';

export interface IrishBenchmark {
  /** County or city the figure describes. */
  label: string;
  pricePerSqM: number;
  basis: string;
  source: string;
  asOf: string;
  /** True when the keeper itself marks the figure as an editorial estimate. */
  editorial: boolean;
}

const COUNTY_CITY_ID: Record<string, string> = {
  Cork: 'cork',
  Galway: 'galway',
  Limerick: 'limerick',
};

function fromCity(city: CityData): IrishBenchmark {
  const editorial = (city.pricePerSqMSource ?? '').startsWith('Editorial');
  return {
    label: city.name,
    pricePerSqM: city.pricePerSqM,
    basis: city.pricePerSqMBasis ?? 'unspecified',
    source: city.pricePerSqMSource ?? 'No source recorded on this city.',
    asOf: city.pricePerSqMAsOf ?? 'unknown',
    editorial,
  };
}

export function benchmarkForCounty(county: string | null): IrishBenchmark | null {
  if (!county) return null;
  if (county === 'Dublin') {
    return {
      label: 'Dublin',
      pricePerSqM: DUBLIN_BASELINE.pricePerSqM,
      basis: 'apartment',
      source: DUBLIN_BASELINE.source,
      asOf: DUBLIN_BASELINE.asOf,
      editorial: false,
    };
  }
  const cityId = COUNTY_CITY_ID[county];
  const city = cityId ? CITIES_DATA.find((c) => c.id === cityId) : undefined;
  return city ? fromCity(city) : null;
}

export function benchmarkForCityName(name: string | null): IrishBenchmark | null {
  if (!name) return null;
  const city = CITIES_DATA.find(
    (c) => c.lane === 1 && c.name.toLowerCase() === name.toLowerCase()
  );
  return city ? fromCity(city) : null;
}

export type CountySource = 'address' | 'routing-key' | 'city';

export interface ResolvedPlace {
  county: string | null;
  routingKey: string | null;
  countySource: CountySource | null;
  /** Set when the routing key is one Compass maps differently from the public list. */
  routingKeyMismatch: RoutingKeyCountyMismatch | null;
  benchmark: IrishBenchmark | null;
}

const LANE1_NAMES = CITIES_DATA.filter((c) => c.lane === 1).map((c) => c.name);

function cityNameInText(text: string): string | null {
  const lower = text.toLowerCase();
  return LANE1_NAMES.find((name) => new RegExp(`\\b${name.toLowerCase()}\\b`).test(lower)) ?? null;
}

/**
 * Prefer a county written in the address. Fall back to Compass's routing-key
 * map, then to a Lane 1 city name (Belfast is not one of the 26 counties).
 */
export function resolveIrishPlace(text: string): ResolvedPlace {
  const routingKey = extractRoutingKey(text);
  const routingKeyMismatch = routingKey ? ROUTING_KEY_COUNTY_MISMATCHES[routingKey] ?? null : null;

  const addressCounty = extractCountyFromAddress(text);
  if (addressCounty) {
    return {
      county: addressCounty,
      routingKey,
      countySource: 'address',
      routingKeyMismatch,
      benchmark: benchmarkForCounty(addressCounty),
    };
  }

  if (routingKey) {
    const county = countyFromRoutingKey(routingKey);
    if (county) {
      return {
        county,
        routingKey,
        countySource: 'routing-key',
        routingKeyMismatch,
        benchmark: benchmarkForCounty(county),
      };
    }
  }

  const cityName = cityNameInText(text);
  if (cityName) {
    return {
      county: null,
      routingKey,
      countySource: 'city',
      routingKeyMismatch,
      benchmark: benchmarkForCityName(cityName),
    };
  }

  return {
    county: null,
    routingKey,
    countySource: null,
    routingKeyMismatch,
    benchmark: null,
  };
}
