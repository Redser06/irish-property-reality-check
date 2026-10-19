import { describe, expect, it } from 'vitest';
import {
  countyFromRoutingKey,
  extractCountyFromAddress,
  extractRoutingKey,
  findEircode,
  normalizeEircode,
  ROUTING_KEY_COUNTY_MISMATCHES,
} from './eircode';

describe('eircode helpers', () => {
  it('normalises a spaced Eircode and the D6W routing key', () => {
    expect(normalizeEircode('d04 x2y8')).toBe('D04 X2Y8');
    expect(normalizeEircode('D6Wab12')).toBe('D6W AB12');
    expect(normalizeEircode('not an eircode')).toBeNull();
  });

  it('finds an Eircode embedded in a longer note', () => {
    expect(findEircode('house at D06 Y2K3, asking €625,000')).toBe('D06 Y2K3');
  });

  it('extracts a routing key and a county the way Compass did', () => {
    expect(extractRoutingKey('14 Maple Court, A63 K2P5')).toBe('A63');
    expect(extractCountyFromAddress('14 Maple Court, Co. Cork')).toBe('Cork');
    expect(countyFromRoutingKey('D04')).toBe('Dublin');
    expect(countyFromRoutingKey('A63')).toBe('Wicklow');
    expect(countyFromRoutingKey('W23')).toBe('Kildare');
    expect(countyFromRoutingKey('H91')).toBeNull();
  });

  it('keeps Compass county assignments that disagree with the public routing-area list', () => {
    expect(countyFromRoutingKey('Y25')).toBe('Wicklow');
    expect(ROUTING_KEY_COUNTY_MISMATCHES.Y25.listedCounty).toBe('Wexford');
    expect(countyFromRoutingKey('A86')).toBe('Dublin');
    expect(ROUTING_KEY_COUNTY_MISMATCHES.A86.listedCounty).toBe('Meath');
  });
});
