import { describe, expect, it } from 'vitest';
import { COMPASS_UNSOURCED_FALLBACK_PPSM } from '../utils/fairPrice';
import { benchmarkForCounty, resolveIrishPlace } from './irishBenchmarks';

describe('resolveIrishPlace', () => {
  it('uses the sourced Dublin apartment benchmark, not the Compass €5,500 fallback', () => {
    const place = resolveIrishPlace('Dublin 12');
    expect(place.county).toBe('Dublin');
    expect(place.benchmark?.pricePerSqM).toBe(6400);
    expect(place.benchmark?.pricePerSqM).not.toBe(COMPASS_UNSOURCED_FALLBACK_PPSM.Dublin);
    expect(place.benchmark?.basis).toBe('apartment');
  });

  it('refuses the unsourced Wicklow fallback', () => {
    const place = resolveIrishPlace('Co. Wicklow');
    expect(place.county).toBe('Wicklow');
    expect(place.benchmark).toBeNull();
    expect(benchmarkForCounty('Wicklow')).toBeNull();
  });

  it('resolves Belfast by city name, because it is not one of the 26 counties', () => {
    const place = resolveIrishPlace('Malone Road, Belfast');
    expect(place.countySource).toBe('city');
    expect(place.benchmark?.label).toBe('Belfast');
    expect(place.benchmark?.editorial).toBe(true);
  });

  it('follows Compass for a mismatched routing key and keeps the flag', () => {
    const place = resolveIrishPlace('Y25 F3K2');
    expect(place.county).toBe('Wicklow');
    expect(place.countySource).toBe('routing-key');
    expect(place.routingKeyMismatch?.listedCounty).toBe('Wexford');
    expect(place.benchmark).toBeNull();
  });

  it('prefers a county written in the address over a mismatched routing key', () => {
    const place = resolveIrishPlace('Dunboyne, Co. Meath A86');
    expect(place.county).toBe('Meath');
    expect(place.countySource).toBe('address');
    expect(place.routingKeyMismatch?.compassCounty).toBe('Dublin');
  });
});
