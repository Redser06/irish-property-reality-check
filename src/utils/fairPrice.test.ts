import { describe, expect, it } from 'vitest';
import {
  askingVsSalePercent,
  deltaPercent,
  estimateFairBand,
  medianPricePerSqm,
  summariseSales,
  verdictForDelta,
} from './fairPrice';

describe('estimateFairBand', () => {
  it('applies the Compass 0.92 / 1.00 / 1.08 band to an integer floor area', () => {
    // 100 m² × €5,500, the shape of the SQL function (not the unsourced rate applied live).
    expect(estimateFairBand(5500, 100)).toEqual({
      low: 506000,
      mid: 550000,
      high: 594000,
    });
  });

  it('rounds a fractional floor area before multiplying, matching p_sqm int', () => {
    expect(estimateFairBand(6400, 78.6).mid).toBe(6400 * 79);
  });
});

describe('verdictForDelta', () => {
  it('uses the Compass cut-points: under -8, through 5, through 15, then over', () => {
    expect(verdictForDelta(-8.01)).toBe('below');
    expect(verdictForDelta(-8)).toBe('fair');
    expect(verdictForDelta(5)).toBe('fair');
    expect(verdictForDelta(5.01)).toBe('above');
    expect(verdictForDelta(15)).toBe('above');
    expect(verdictForDelta(15.01)).toBe('overpriced');
  });

  it('grades the default €550k / 850 sq ft Dublin case as above the sourced benchmark', () => {
    const sqm = Math.round(850 / 10.7639);
    const band = estimateFairBand(6400, sqm);
    const delta = deltaPercent(550000, band.mid);
    expect(sqm).toBe(79);
    expect(band.mid).toBe(505600);
    expect(verdictForDelta(delta)).toBe('above');
  });
});

describe('sale summaries', () => {
  const sales = [
    { price: 300000, floorArea: 100 },
    { price: 400000, floorArea: 20 },
    { price: 500000, floorArea: 100 },
  ];

  it('drops floor areas of 30 m² or less from the €/m² mean, like useMarketStats', () => {
    const stats = summariseSales(sales);
    expect(stats.totalSales).toBe(3);
    expect(stats.avgPrice).toBe(400000);
    // sorted prices [300k, 400k, 500k], floor(3/2) = index 1
    expect(stats.medianPrice).toBe(400000);
    // 3000 and 5000 only; the 20 m² sale is excluded
    expect(stats.avgPricePerSqm).toBe(4000);
  });

  it('uses the interpolated median €/m² that percentile_cont(0.5) would return', () => {
    const { medianPpsm, compCount } = medianPricePerSqm(sales);
    expect(compCount).toBe(2);
    expect(medianPpsm).toBe(4000);
  });

  it('reports asking-versus-sale the way formatPriceDiff did', () => {
    expect(askingVsSalePercent(595000, 625000)).toBeCloseTo(5.042, 2);
    expect(askingVsSalePercent(395000, 385000)).toBeLessThan(0);
  });
});
