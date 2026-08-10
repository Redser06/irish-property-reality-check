/**
 * Unit conversion, in one place.
 *
 * SQFT_PER_SQM used to be declared twice — once in comparatorEngine.ts and again
 * in CityDetailModal.tsx — which is exactly how two parts of an app quietly start
 * disagreeing about what a square metre is.
 */

export const SQFT_PER_SQM = 10.7639;

export function sqMToSqFt(sqM: number): number {
  return sqM * SQFT_PER_SQM;
}

export function sqFtToSqM(sqFt: number): number {
  return sqFt / SQFT_PER_SQM;
}
